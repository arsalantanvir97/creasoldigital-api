require("dotenv").config()
require("./config/database").connect()
const express = require("express")
const app = express()
const cors = require("cors")
const fileUpload = require("express-fileupload")
const path = require("path")
const fs = require("fs")
var bodyParser = require("body-parser")

app.use(fileUpload())

app.use(cors())
// app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
///
app.use(express.json())

var routesPath = require("path").join(__dirname, "routes")

require("fs")
  .readdirSync(routesPath)
  .forEach((file) => app.use("/api", require("./routes/" + file)))

app.get("/payment", (req, res) => {
  res.sendFile("views/payment.html", { root: __dirname })
})

app.get("/recurring-payment", (req, res) => {
  res.sendFile("views/recurring-payment.html", { root: __dirname })
})

app.get("/success", (req, res) => {
  res.sendFile("views/success.html", { root: __dirname })
})

app.get("/cancel", (req, res) => {
  res.sendFile("views/cancel.html", { root: __dirname })
})

const profileDirectory = path.join(__dirname, "images")
const postDirectory = path.join(__dirname, "post-images")
app.use("/profiles", express.static(profileDirectory))
app.use("/post-images", express.static(postDirectory))

app.use("*", (req, res) => {
  res.status(404).json({
    success: "false",
    message: "Page not found",
    error: {
      statusCode: 404,
      message: "You reached a route that is not defined on this server",
    },
  })
})

module.exports = app
