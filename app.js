require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const app = express();

var bodyParser = require('body-parser');

// app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(express.json());

var routesPath = require("path").join(__dirname, "routes");

require("fs")
    .readdirSync(routesPath)
    .forEach((file) => app.use('/api', require("./routes/" + file)));


app.get('/payment', (req, res) => {
    res.sendFile('views/payment.html', {root: __dirname })
});


app.get('/recurring-payment', (req, res) => {
    res.sendFile('views/recurring-payment.html', {root: __dirname })
});

app.get('/success', (req, res) => {
    res.sendFile('views/success.html', {root: __dirname })
});

app.get('/cancel', (req, res) => {
    res.sendFile('views/cancel.html', {root: __dirname })
});
        
app.use("*", (req, res) => {
    res.status(404).json({
        success: "false",
        message: "Page not found",
        error: {
            statusCode: 404,
            message: "You reached a route that is not defined on this server",
        },
    });
});

module.exports = app;