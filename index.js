const https = require("https")
const express = require("express")
const app = require("./app")

const fs = require("fs")
const { API_PORT } = process.env
const port = process.env.PORT || 4001

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
