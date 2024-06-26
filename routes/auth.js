const express = require("express")
const authRoutes = express.Router()
const auth = require("../middleware/auth")
const User = require("../model/user")
const Order = require("../model/order")
const Package = require("../model/package")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const {
  sendEmail,
  NotificationType,
  createNotification,
  sendEmail2,
} = require("../helpers")
const payments = require("../model/payments")
const forgetpassword = require("../model/forgetpassword")

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

authRoutes.post("/register", async (req, res) => {
  try {
    // Get user input
    const { first_name, last_name, email, password, phone } = req.body
    console.log(req.body)
    // Validate user input
    if (!(email && password && first_name && last_name)) {
      res.status(400).send("All input is required")
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ email })

    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login")
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10)

    // Create user in our database
    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
      status: true,
      phone,
      is_admin: false,
    })

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
    const product = await Package.findOne({ name: "Trial" })
    console.log("product", product, product._id)
    const orderToCreate = getOrderToCreate({ user_id: user._id }, product)
    console.log("orderToCreate", orderToCreate)
    const newlyCreatedOrder = await Order.create(orderToCreate)
    const newlyCreatedPayment = await payments.create({
      amount: Number(product.price),
      order: newlyCreatedOrder._id,
      payment_type: orderToCreate.payment_type,
      user: orderToCreate.user,
    })

    // return new user
    res.status(201).json(user)
  } catch (err) {
    console.log(err)
  }
})

// Login
authRoutes.post("/login", async (req, res) => {
  try {
    // Get user input
    const { email, password } = req.body

    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required")
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).send("No User found")
    }
    if (!user.status) return res.status(400).send("User Inactive")

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        { expiresIn: "1y" }
      )

      // Deleting unneseccary details
      delete user.password
      delete user.is_admin

      // save user token
      user.token = token

      // user
      res.status(200).json(user)
    }
    res.status(400).send("Invalid Credentials")
  } catch (err) {
    console.log(err)
  }
})

authRoutes.post("/emailcheck", async (req, res) => {
  try {
    // Get user input
    const { email } = req.body

    // Validate user input
    // Validate if user exist in our database
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(201).send("No User found")
    }
    // user
    res.status(200).send("Valid Credentials")
  } catch (err) {
    console.log(err)
  }
})
authRoutes.post("/forget-password", async (req, res) => {
  const { email } = req.body

  if (!email) {
    res.status(400).send("email field is required")
  }

  const user = await User.findOne({ email })

  if (!user) {
    res.status(400).send("invalid email address")
  }

  const code = Math.floor(100000 + Math.random() * 900000)

  await forgetpassword.create({
    userId: user._id,
    code,
  })

  sendEmail("forgetpassword", email, "forget email", {
    code,
  })

  res.status(200).send({
    message: "Email has been sent check your inbox.",
  })
})
authRoutes.post("/adminsenduser-forget-password", async (req, res) => {
  const { email } = req.body

  if (!email) {
    res.status(400).send("email field is required")
  }

  const user = await User.findOne({ email })

  if (!user) {
    res.status(400).send("invalid email address")
  }
  const html = `<p>You have been sent a link by admin to update your password.
  \n\n <br/>  https://creasoldigital-d8f2c.web.app/user/setpassword/${email}  
  </p>`
  sendEmail2(email, "forget email", html, {})

  res.status(200).send({
    message: "Email has been sent check your inbox.",
  })
})
authRoutes.post("/reset-password", async (req, res) => {
  const { code, password, password_confirmation } = req.body

  if (!(code && password && password_confirmation)) {
    res.status(400).send({
      message: "unauthorized request",
      code: "code is required",
      password: "code is required",
      password_confirmation: "code is required",
    })
    return
  }

  if (password !== password_confirmation) {
    res.status(400).send({
      message: "password miss match",
    })
    return
  }

  const codeDco = await forgetpassword.findOne({ code })

  if (!codeDco) {
    res.status(401).send({
      message: "Invalid code.!",
    })
    return
  }

  await forgetpassword.findByIdAndDelete(codeDco._id)

  const newEncryptedPassword = await bcrypt.hash(password, 10)

  await User.findByIdAndUpdate(codeDco.userId, {
    password: newEncryptedPassword,
  })

  res.status(200).send({
    message: "password has been reset.",
  })
})

authRoutes.get("/profile", auth, async (req, res) => {
  // console.log();
  const user = await User.findOne({ email: req.user.email })

  res.status(200).json(user)
})

authRoutes.post("/updatepassword", async (req, res) => {
  try {
    // Get user input
    const { existingpassword, newpassword, confirm_password, email } = req.body
    // Validate user input
    console.log("req.body", req.body)
    const user = await User.findOne({ email })
    const validpassword = await bcrypt.compare(existingpassword, user.password)
    if (!validpassword) {
      return res.status(400).json({ message: "Invalid Credentials" })
    }
    if (existingpassword === newpassword) {
      return res.status(400).json({
        message: "please type new password which is not used earlier",
      })
    }
    //if password and confirm password matches
    if (newpassword !== confirm_password) {
      return res.status(400).json({ message: "confirm password doesnot match" })
    }

    //hash password
    const salt = await bcrypt.genSalt(10)
    user.password = bcrypt.hashSync(newpassword, salt)

    await user.save()
    res.status(200).json({
      message: "password updated Successfully",
    })
  } catch (err) {
    console.log(err)
  }
})
authRoutes.post("/adminupdateuserpassword", async (req, res) => {
  try {
    // Get user input
    const { newpassword, confirm_password, email } = req.body
    // Validate user input
    console.log("req.body", req.body)
    const user = await User.findOne({ email })
    //if password and confirm password matches
    if (newpassword !== confirm_password) {
      return res.status(400).json({ message: "confirm password doesnot match" })
    }

    //hash password
    const salt = await bcrypt.genSalt(10)
    user.password = bcrypt.hashSync(newpassword, salt)

    await user.save()
    res.status(200).json({
      message: "password updated Successfully",
    })
  } catch (err) {
    console.log(err)
  }
})
// authRoutes.get("/user/:id?", auth, async (req, res) => {
//   // console.log();
//   try {
//     const user = await GetUser(req.user.user_id);
//     if (user.is_admin) {
//       const UserToSend = await User.findOne({ email: req.user.email });
//       delete UserToSend.password;
//       return res.status(200).json(UserToSend);
//     } else {
//       return res.status(401).send("Unauthorized Request");
//     }
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

module.exports = authRoutes
