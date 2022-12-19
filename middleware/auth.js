const jwt = require("jsonwebtoken");

const config = process.env;

const aunAuthorizedResponse = {
    success: false,
    message: "A token is required for authentication",
    error: {
        statusCode: 401,
        message: 'Unauthorized request!'
    }
}

const verifyToken = (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["x-access-token"];

    if (!token) {
        return res.status(401).send(aunAuthorizedResponse);
    }
    try {
        const decoded = jwt.verify(token, config.TOKEN_KEY);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send(aunAuthorizedResponse);
    }
    return next();
};

module.exports = verifyToken;