const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
// const Package = require("../model/package");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuid } = require("uuid");
const { default: Stripe } = require("stripe");
const User = require("../model/user");
const Order = require("../model/order");

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
    }).populate("user");
  } else {
    data = await Order.find(filter, query.fields ? query.fields : null, {
      limit: perPage,
      skip: (page - 1) * perPage,
    });
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
      .populate("posts");
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
    const newlyCreatedOrder = await Order.create(
      getOrderToCreate(user, product)
    );
    console.log("Order Created Successfully");
    console.log(newlyCreatedOrder);
    return res.status(200).json(newlyCreatedOrder);
  } catch (error) {
    return res.status(400).json(error);
  }
});

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
