const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const comment = require("../model/comment");
const post = require("../model/post");

// Add Comment
router.post("/comment", auth, async (req, res) => {
  const commentToAdd = { ...req.body };
  try {
    const newlyAddedComment = await (
      await comment.create(commentToAdd)
    ).populate("user");
    const fetchedPost = await post.findByIdAndUpdate(
      commentToAdd.post,
      {
        $push: { comments: newlyAddedComment._id },
        status: "Rejected with Comments",
      },
      { new: true, upsert: true }
    );
    console.log(commentToAdd);
    console.log(newlyAddedComment);
    console.log(fetchedPost);
    return res.status(201).json(newlyAddedComment);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;
