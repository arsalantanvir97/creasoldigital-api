require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const app = express();

app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', usersRoutes);

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