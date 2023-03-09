const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
// const Package = require("../model/package");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuid } = require("uuid");
const { default: Stripe } = require("stripe");
const User = require("../model/user");
const Order = require("../model/order");
const { createNotification, NotificationType, GetUser } = require("../helpers");
const payments = require("../model/payments");

router.get("/orders", auth, async (req, res) => {
  const user = await User.findById(req.user.user_id);
  const { query } = req;

  var page = parseInt(query.page) || 1; //for next page pass 1 here
  var perPage = parseInt(query.perPage) || 10;

  var filter = {};
  if (!user.is_admin) {
    filter.user = user._id;
  }

  console.log(filter);
  console.log(user);

  var top = parseInt(query.top);
  if (!isNaN(top)) {
    perPage = top;
    page = 1;
  }
  console.log("order listing called");

  const count = await Order.find(filter).countDocuments();

  let data = {};
  if (user.is_admin) {
    data = await Order.find(filter, query.fields ? query.fields : null, {
      limit: perPage,
      skip: (page - 1) * perPage,
      sort: { createdAt: -1 },
    }).populate("user");
  } else {
    data = await Order.find(filter, query.fields ? query.fields : null)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip((page - 1) * perPage);
  }

  res.status(200).send({
    total: count,
    data,
    currentPage: page,
    perPage,
    totalPages: Math.ceil(count / perPage),
    hasNextPage: page < Math.ceil(count / page),
    hasPrevPage: page > 1,
  });
});

router.get("/order/:id?", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate({ path: "posts", options: { sort: { updatedAt: -1 } } });
    console.log("Order Fetched");
    console.log(order);
    return res.status(200).send(order);
  } catch (error) {
    return res.status(500).send(error);
  }
});
router.post("/payment", auth, async (req, res) => {
  const { pkg: product, stripe_token: token } = req.body;
  const { user } = req;
  try {
    // Check if customer already exist in stripe
    let customer = await stripe.customers.search({
      query: `email:'${token.email}'`,
    });
    if (customer.data.length === 0) {
      customer = await stripe.customers.create({
        email: token.email,
        source: token.id,
      });
      console.log("Customer Created ");
      console.log(customer);
    } else {
      customer = customer.data[0];
      console.log("Already Existed Created ");
      console.log(customer);
    }
    await createCharges(customer, product, token);
    console.log("Charges Created Successfully");
    const orderToCreate = getOrderToCreate(user, product);
    const newlyCreatedOrder = await Order.create(orderToCreate);
    const newlyCreatedPayment = await payments.create({
      amount: product.price,
      order: newlyCreatedOrder._id,
      payment_type: orderToCreate.payment_type,
      user: orderToCreate.user,
    });
    const Notification = await createNotification({
      user: user.user_id,
      order: newlyCreatedOrder._id,
      notification_type: NotificationType.Purchase,
    });
    console.log("Order Created Successfully");
    console.log(newlyCreatedOrder);
    console.log("Notification");
    console.log(Notification);
    return res.status(201).json(newlyCreatedOrder);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});
router.get("/get-user-payments", auth, async (req, res) => {
  try {
    const authUser = await GetUser(req.user.user_id);
    const { start, end } = req.query;
    const filter = { createdAt: {} };

    if (!authUser.is_admin) {
      filter.user = authUser._id;
    }
    if (start) {
      const [sMonth, sYear] = start.split(",");
      console.log(sMonth);
      console.log(sYear);
      filter.createdAt.$gte = new Date(sYear, sMonth - 1, 1);
    }
    if (end) {
      const [eMonth, eYear] = end.split(",");
      console.log(eMonth);
      console.log(eYear);
      filter.createdAt.$lt = new Date(
        eYear,
        eMonth - 1,
        getMonthwiseMaxDates(eYear)[eMonth - 1],
        23,
        59,
        59,
        999
      );
    }
    if (!Object.keys(filter.createdAt).length) {
      delete filter.createdAt;
    }
    console.log(filter);
    const UserPayments = await payments
      .find(filter)
      .populate("order")
      .populate({
        path: "user",
        select: "-password",
      });
    console.log(UserPayments);
    return res.status(200).json(UserPayments);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

const getMonthwiseMaxDates = (year) => {
  const monthwiseMaxdates = {
    0: 31,
    1: isLeapyear(year) ? 28 : 29,
    2: 31,
    3: 30,
    4: 31,
    5: 30,
    6: 31,
    7: 31,
    8: 30,
    9: 31,
    10: 30,
    11: 31,
  };
  return monthwiseMaxdates;
};

const isLeapyear = (year) => {
  if (year % 4 == 0 || (year % 400 == 0 && year % 1000 != 0)) {
    return true;
  } else {
    return false;
  }
};

const getOrderToCreate = (user, product) => {
  const neworder = {
    user: user.user_id,
    payment_type: "Non Recurrent",
    pkg_name: product.name,
    pkg_price: product.price,
    pkg_description: product.description,
    pkg_duration: product.duration,
    pkg_interval: product.interval,
    medium: "Facebook",
    form_status: "Not Submitted",
    status: "Active",
    form_filltime: new Date(),
  };
  return neworder;
};

const createCharges = (customer, product, token) => {
  const charge = stripe.charges.create({
    amount: product.price * 100,
    currency: "usd",
    customer: customer.id,
    receipt_email: token.email,
    description: `${product.name}`,
  });
  // console.log(charge);
  return charge;
  // .then((result) => res.status(200).json(result));
};

router.get("/test", async (req, res) => {
  res.send("test");
});

module.exports = router;
