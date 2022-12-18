const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../model/user");

router.get("/users", auth, async (req, res) => {

    const { query } = req;

    var page = parseInt(query.page) || 1; //for next page pass 1 here
    var perPage = parseInt(query.perPage) || 5;

    var filter = {
        name: query.q
    };

    const count = await User.find(filter).countDocuments();

    const data = await User.find(filter,
        null, {
        limit: perPage,
        skip: (page - 1) * perPage,
    });

    res.status(200).send({
        total: count,
        data,
        currentPage: page,
        perPage,
        totalPages: Math.ceil(count / perPage),
        hasNextPage: page < Math.ceil(count / page),
        hasPrevPage: page > 1
    });
});

module.exports = router;