const https = require("https");
const express = require("express");
const app = require("./app");


const fs = require("fs");
const { API_PORT } = process.env;
const port = process.env.PORT || API_PORT;

const local = false;
let credentials = {};

if (local) {
  credentials = {
    key: fs.readFileSync("/etc/apache2/ssl/onlinetestingserver.key", "utf8"),
    cert: fs.readFileSync("/etc/apache2/ssl/onlinetestingserver.crt", "utf8"),
    ca: fs.readFileSync("/etc/apache2/ssl/onlinetestingserver.ca")
  };
} else {
  credentials = {
    key: fs.readFileSync("../certs/ssl.key"),
    cert: fs.readFileSync("../certs/ssl.crt"),
    ca: fs.readFileSync("../certs/ca-bundle")
  };
}


const httpsServer = https.createServer(credentials, app);
httpsServer.listen(port, () => {
  console.log(
    "\u001b[" + 34 + "m" + `Server started on port: ${port}` + "\u001b[0m"
  );
});

