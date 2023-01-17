const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const User = require("../model/user");
const comment = require("../model/comment");
const Order = require("../model/order");
const post = require("../model/post");

// Get a single post
router.get("/post/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const PostToSend = await post
      .findById(id)
      .populate("user")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "-password",
          model: "user",
        },
      });
    console.log("Post Fetched");
    console.log(PostToSend);
    return res.status(200).json(PostToSend);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

// Create a post
router.post("/post", auth, async (req, res) => {
  try {
    const { OrderId, title, description, status, post_medium } = req.body;
    const RelatedOrder = await Order.findById(OrderId);
    // User to which this order belong
    if (!RelatedOrder) {
      return res.status(400).json({ message: "Order not exist!" });
    }
    const user = RelatedOrder.user;
    console.log(RelatedOrder);
    const PostToAdd = {
      user,
      title,
      description,
      status,
      post_medium,
      order: RelatedOrder._id,
    };
    const NewlyAddedPost = await post.create(PostToAdd);
    RelatedOrder.posts.push(NewlyAddedPost._id);
    await Order.findByIdAndUpdate(OrderId, { posts: RelatedOrder.posts });
    return res.status(201).json(NewlyAddedPost);
    // return res.status(201).json({});
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.put("/post/:id?", auth, async (req, res) => {
  try {
    const { id } = req.params;
    // const { title, description, status, post_medium } = req.body;
    console.log(id);
    console.log({ ...req.body });
    const updatedPost = await post.findByIdAndUpdate(
      id,
      { ...req.body },
      {
        new: true,
      }
    );
    console.log(updatedPost);
    return res.status(204).json(updatedPost);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
