const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Package = require("../model/package")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const User = require("../model/user")
const Order = require("../model/order")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const {
  createNotification,
  NotificationType,
  GetUser,
  sendEmail,
  sendEmail2,
} = require("../helpers")
const payments = require("../model/payments")
const UserSubscription = require("../model/usersubscription")

router.post("/create-payment-intent", async (req, res) => {
  const { packageID } = req.body
  const package = await Package.findById(packageID)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: package.price * 100,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  })

  res.send({
    clientSecret: paymentIntent.client_secret,
  })
})

router.get("/orders", auth, async (req, res) => {
  const user = await User.findById(req.user.user_id)
  const { query } = req

  var page = parseInt(query.page) || 1 //for next page pass 1 here
  var perPage = parseInt(query.perPage) || 50000

  var filter = {}
  if (!user.is_admin) {
    filter.user = user._id
  }

  console.log(filter)
  console.log(user)

  var top = parseInt(query.top)
  if (!isNaN(top)) {
    perPage = top
    page = 1
  }
  console.log("order listing called")

  const count = await Order.find(filter).countDocuments()

  let data = {}
  if (user.is_admin) {
    data = await Order.find(filter, query.fields ? query.fields : null, {
      limit: perPage,
      skip: (page - 1) * perPage,
      sort: { createdAt: -1 },
    })
      .populate("user")
      .sort({ createdAt: -1 })
  } else {
    data = await Order.find(filter, query.fields ? query.fields : null)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip((page - 1) * perPage)
  }

  res.status(200).send({
    total: count,
    data,
    currentPage: page,
    perPage,
    totalPages: Math.ceil(count / perPage),
    hasNextPage: page < Math.ceil(count / page),
    hasPrevPage: page > 1,
  })
})

router.post("/order/registerandsubscription", async (req, res) => {
  console.log("req.body2222", req.body)
  try {
    const {
      product,
      paymentIntent,
      paymentIntentClientSecret,
      first_name,
      last_name,
      email,
      phone,
      password,
    } = req.body

    // const user = await User.findOne({ email: req.body.email })
    // console.log('user', user)
    encryptedPassword = await bcrypt.hash(password, 10)
    const userr = await User.create({
      first_name: first_name,
      last_name: last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
      status: true,
      phone: phone,
      is_admin: false,
    })
    const user = await userr.save()
    console.log("userrrrrrr", user)
    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    )
    delete user.password
    // save user token
    user.token = token

    // return res.status(200).json(req.body);
    // const r = await stripe.paymentIntents.retrieve(req.body.paymentIntentClientSecret);
    const r = await stripe.paymentIntents.retrieve(paymentIntent)
    // const { paymentIntent } = data;
    // console.log('Hello there,', data);
    // return res.status(200).send(r);

    try {
      // Check if customer already exist in stripe
      const orderToCreate = getOrderToCreate({ user_id: user._id }, product)
      console.log("orderToCreate", orderToCreate)
      const newlyCreatedOrder = await Order.create(orderToCreate)
      const newlyCreatedPayment = await payments.create({
        amount: Number(product.price),
        order: newlyCreatedOrder._id,
        payment_type: orderToCreate.payment_type,
        user: orderToCreate.user,
      })
      console.log("newlyCreatedPayment", newlyCreatedPayment)
      const html = `<p>You have subscribed a package, Please fill the form within 24 hours.
      \n\n <br/> https://creasoldigital-d8f2c.web.app/user/form/${newlyCreatedOrder._id}  
      </p>`

      sendEmail2(email, "Fill the form", html, {})

      const Notification = await createNotification({
        user: user._id,
        order: newlyCreatedOrder._id,
        notification_type: NotificationType.Purchase,
        isAdmin: false,
      })
      return res.status(201).json(newlyCreatedOrder)
    } catch (error) {
      const Notification = await createNotification({
        user: user._id,
        order: newlyCreatedOrder._id,
        notification_type: NotificationType.TransactionFailed,
        isAdmin: false,
      })

      return res.status(500).json(error)
    }
  } catch (error) {
    console.log("error", error)
    return res.status(500).send(error.message)
  }
})
router.post("/order/create", auth, async (req, res) => {
  try {
    // return res.status(200).json(req.body);
    // const r = await stripe.paymentIntents.retrieve(req.body.paymentIntentClientSecret);
    const r = await stripe.paymentIntents.retrieve(req.body.paymentIntent)
    // const { paymentIntent } = data;
    // console.log('Hello there,', data);
    // return res.status(200).send(r);

    const { product, email } = req.body
    console.log("product", product)
    const { user } = req
    try {
      // Check if customer already exist in stripe
      const orderToCreate = getOrderToCreate(
        { user_id: req.user.user_id },
        product
      )
      console.log("orderToCreate", orderToCreate)

      const newlyCreatedOrder = await Order.create(orderToCreate)
      console.log("newlyCreatedOrder", newlyCreatedOrder)

      const newlyCreatedPayment = await payments.create({
        amount: Number(product.price),
        order: newlyCreatedOrder._id,
        payment_type: orderToCreate.payment_type,
        user: orderToCreate.user,
      })
      const html = `<p>You have subscribed a package, Please fill the form within 24 hours.
      \n\n <br/> https://creasoldigital-d8f2c.web.app/user/form/${newlyCreatedOrder._id}  
      </p>`

      sendEmail2(email, "Fill the form", html, {})

      const Notification = await createNotification({
        user: user.user_id,
        order: newlyCreatedOrder._id,
        notification_type: NotificationType.Purchase,
        isAdmin: false,
      })
      return res.status(201).json(newlyCreatedOrder)
    } catch (error) {
      const Notification = await createNotification({
        user: user.user_id,
        order: newlyCreatedOrder._id,
        notification_type: NotificationType.TransactionFailed,
        isAdmin: false,
      })

      return res.status(500).json(error)
    }
  } catch (error) {
    return res.status(500).send(error.message)
  }
})

router.post("/order/reminder", auth, async (req, res) => {
  try {
    // return res.status(200).json(req.body);
    // const r = await stripe.paymentIntents.retrieve(req.body.paymentIntentClientSecret);

    const { id } = req.body
    try {
      const newlyCreatedOrder = await Order.findById(id).populate("user")
      const email = newlyCreatedOrder.user.email
      const html = `<p>You have subscribed a package, Please fill the form within 24 hours.
      \n\n <br/> https://creasoldigital-d8f2c.web.app/user/form/${newlyCreatedOrder._id}  
      </p>`

      sendEmail2(email, "Fill the form", html, {})

      const Notification = await createNotification({
        user: newlyCreatedOrder.user._id,
        order: newlyCreatedOrder._id,
        notification_type: NotificationType.Reminder,
        isAdmin: true,
      })
      return res.status(201).json(newlyCreatedOrder)
    } catch (error) {
      return res.status(500).json(error)
    }
  } catch (error) {
    return res.status(500).send(error.message)
  }
})

router.post("/order/usersignupsubscribe", async (req, res) => {
  console.log("usersignupsubscribe")
  console.log("req.bodyreq.body", req.body)
  try {
    const {
      packageID,
      paymentMethod,
      first_name,
      last_name,
      email,
      phone,
      password,
    } = req.body

    // const user = await User.findOne({ email: req.body.email })
    // console.log('user', user)
    encryptedPassword = await bcrypt.hash(password, 10)
    const userr = await User.create({
      first_name: first_name,
      last_name: last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
      status: true,
      phone: phone,
      is_admin: false,
    })
    const user = await userr.save()
    console.log("userrrrrrr", user)
    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    )
    delete user.password
    // save user token
    user.token = token

    const package = await Package.findById(packageID)

    // Create a customer
    let { data: customerList } = await stripe.customers.list({}),
      customer
    const customerExists = customerList.filter((c) => c.email === user.email)

    if (customerExists.length === 0) {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.first_name + " " + user.last_name,
        payment_method: paymentMethod,
        invoice_settings: { default_payment_method: paymentMethod },
      })
    } else {
      customer = customerExists[0]
    }

    const { data: productsList } = await stripe.products.list({})
    const productExists = productsList.filter((p) => p.name === package.name)
    let product
    if (productExists.length > 0) {
      product = productExists[0]
    } else {
      // Create a product
      product = await stripe.products.create({
        name: package.name,
      })
    }

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: "USD",
            product: product.id,
            unit_amount: package.price * 100,
            recurring: {
              interval: "month",
            },
          },
        },
      ],

      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    })

    // console.log('customer', customer)
    // console.log('product', product)
    // console.log('subscription', subscription)

    const orderToCreate = getOrderToCreate({ user_id: user._id }, package, true)
    const newlyCreatedOrder = await Order.create({
      ...orderToCreate,
      is_recurring: true,
      subscription_detail: subscription,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    const newlyCreatedPayment = await payments.create({
      amount: Number(package.price),
      order: newlyCreatedOrder._id,
      payment_type: orderToCreate.payment_type,
      user: orderToCreate.user,
    })

    await UserSubscription.create({
      user: user._id,
      package: packageID,
      subscription_id: subscription.id,
      order: newlyCreatedOrder._id,
    })

    // Send back the client secret for payment
    res
      .json({
        message: "Subscription successfully initiated",
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      })
      .status(201)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/order/subscribe", auth, async (req, res) => {
  if (req.method != "POST") return res.status(400)
  console.log(
    "subscribesubscribesubscribesubscribesubscribesubscribesubscribesubscribesubscribe"
  )
  try {
    const { packageID, paymentMethod } = req.body

    const user = await User.findById(req.user.user_id)
    const package = await Package.findById(packageID)

    // Create a customer
    let { data: customerList } = await stripe.customers.list({}),
      customer
    const customerExists = customerList.filter((c) => c.email === user.email)

    if (customerExists.length === 0) {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.first_name + " " + user.last_name,
        payment_method: paymentMethod,
        invoice_settings: { default_payment_method: paymentMethod },
      })
    } else {
      customer = customerExists[0]
    }

    const { data: productsList } = await stripe.products.list({})
    const productExists = productsList.filter((p) => p.name === package.name)
    let product
    if (productExists.length > 0) {
      product = productExists[0]
    } else {
      // Create a product
      product = await stripe.products.create({
        name: package.name,
      })
    }

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: "USD",
            product: product.id,
            unit_amount: package.price * 100,
            recurring: {
              interval: "month",
            },
          },
        },
      ],

      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    })

    // console.log('customer', customer)
    // console.log('product', product)
    // console.log('subscription', subscription)

    const orderToCreate = getOrderToCreate({ user_id: user._id }, package, true)
    const newlyCreatedOrder = await Order.create({
      ...orderToCreate,
      is_recurring: true,
      subscription_detail: subscription,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    const newlyCreatedPayment = await payments.create({
      amount: Number(package.price),
      order: newlyCreatedOrder._id,
      payment_type: orderToCreate.payment_type,
      user: orderToCreate.user,
    })

    await UserSubscription.create({
      user: user._id,
      package: packageID,
      subscription_id: subscription.id,
      order: newlyCreatedOrder._id,
    })

    // Send back the client secret for payment
    res
      .json({
        message: "Subscription successfully initiated",
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      })
      .status(201)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/subscriptions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id)
    const subscriptions = await UserSubscription.find({
      user: user._id,
      status: "ACTIVE",
    })
    res.json(subscriptions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/order/unsubscribe", auth, async (req, res) => {
  try {
    let subscriptionID = req.body.subscriptionID,
      subscription

    if (req.body.orderID && !subscriptionID) {
      const order = await Order.findById(req.body.orderID)
      subscriptionID = order.subscription_detail.id
      subscription = await UserSubscription.findOne({
        subscription_id: subscriptionID,
      })
    } else {
      subscription = await UserSubscription.findById(subscriptionID)
    }

    // const user = await User.findById(req.user.user_id);
    const result = await stripe.subscriptions.update(
      subscription.subscription_id,
      { cancel_at_period_end: true }
    )
    console.log(result, subscription)

    const order = await Order.findById(subscription.order)

    await order.update({
      cancelled_at: order.current_period_end,
      subscription_detail: { ...order.subscription_detail, ...result },
    })

    await subscription.update({
      status: "cancelled",
    })

    res.json(subscription)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/order/:id?", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate({ path: "posts", options: { sort: { updatedAt: -1 } } })
    console.log("Order Fetched")
    console.log(order)
    return res.status(200).send(order)
  } catch (error) {
    return res.status(500).send(error)
  }
})
router.post("/payment", auth, async (req, res) => {
  const { pkg: product, stripe_token: token } = req.body
  const { user } = req
  try {
    // Check if customer already exist in stripe
    let customer = await stripe.customers.search({
      query: `email:'${token.email}'`,
    })
    if (customer.data.length === 0) {
      customer = await stripe.customers.create({
        email: token.email,
        source: token.id,
      })
      console.log("Customer Created ")
      console.log(customer)
    } else {
      customer = customer.data[0]
      console.log("Already Existed Created ")
      console.log(customer)
    }
    await createCharges(customer, product, token)
    console.log("Charges Created Successfully")
    const orderToCreate = getOrderToCreate(user, product)
    const newlyCreatedOrder = await Order.create(orderToCreate)
    const newlyCreatedPayment = await payments.create({
      amount: Number(product.price),
      order: newlyCreatedOrder._id,
      payment_type: orderToCreate.payment_type,
      user: orderToCreate.user,
    })
    const Notification = await createNotification({
      user: user.user_id,
      order: newlyCreatedOrder._id,
      notification_type: NotificationType.Purchase,
      isAdmin: false,
    })
    console.log("Order Created Successfully")
    console.log(newlyCreatedOrder)
    console.log("Notification")
    console.log(Notification)
    return res.status(201).json(newlyCreatedOrder)
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})
router.get("/get-user-payments", auth, async (req, res) => {
  try {
    const authUser = await GetUser(req.user.user_id)
    const { start, end } = req.query
    const filter = { createdAt: {} }

    if (!authUser.is_admin) {
      filter.user = authUser._id
    }
    if (start) {
      const [sMonth, sYear] = start.split(",")
      console.log(sMonth)
      console.log(sYear)
      filter.createdAt.$gte = new Date(sYear, sMonth - 1, 1)
    }
    if (end) {
      const [eMonth, eYear] = end.split(",")
      console.log(eMonth)
      console.log(eYear)
      filter.createdAt.$lt = new Date(
        eYear,
        eMonth - 1,
        getMonthwiseMaxDates(eYear)[eMonth - 1],
        23,
        59,
        59,
        999
      )
    }
    if (!Object.keys(filter.createdAt).length) {
      delete filter.createdAt
    }
    console.log(filter)
    const UserPayments = await payments
      .find(filter)
      .populate("order")
      .populate({
        path: "user",
        select: "-password",
      })
      .sort({ createdAt: -1 })
    console.log(UserPayments)
    return res.status(200).json(UserPayments)
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})

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
  }
  return monthwiseMaxdates
}

const isLeapyear = (year) => {
  if (year % 4 == 0 || (year % 400 == 0 && year % 1000 != 0)) {
    return true
  } else {
    return false
  }
}

const getOrderToCreate = (user, product, isRecurring = false) => {
  var d = new Date()
  d.setDate(d.getDate() + 1)
  var m = new Date()
  m.setMonth(m.getMonth() + Number(product.duration))

  const neworder = {
    user: user.user_id,
    payment_type: isRecurring ? "Recurring" : "Non Recurrent",
    pkg_name: product.name,
    pkg_price: product.price,
    pkg_description: product.description,
    pkg_duration: product.duration,
    pkg_interval: product.interval,
    medium: "Facebook",
    form_status: "Not Submitted",
    status: "Active",
    form_filltime: d,
    current_period_end: m,
  }
  return neworder
}

const createCharges = (customer, product, token) => {
  const charge = stripe.charges.create({
    amount: product.price * 100,
    currency: "usd",
    customer: customer.id,
    receipt_email: token.email,
    description: `${product.name}`,
  })
  // console.log(charge);
  return charge
  // .then((result) => res.status(200).json(result));
}

module.exports = router
