const https = require("https")
const express = require("express")
const app = require("./app")

const fs = require("fs")
const { API_PORT } = process.env
const port = 4001

const local = false
let credentials = {}

app.listen(port, () => {
  console.log(
    "\u001b[" + 34 + "m" + `Server started on port: ${port}` + "\u001b[0m"
  )
})
