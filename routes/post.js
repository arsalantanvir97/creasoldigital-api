const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const User = require("../model/user");
const comment = require("../model/comment");
const Order = require("../model/order");
const post = require("../model/post");
const { v4: uuid } = require("uuid");

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

router.put("/post-images/:id?", auth, async (req, res) => {
  try {
    const { id: PostId } = req.params;
    if (req.files) {
      const { files } = req;
      console.log(files["profile[0]"]);
      const FileKeys = Object.keys(files);
      console.log(FileKeys);
      const uploadPath = "/post-images/" + PostId + "_";
      const filesSaved = [];
      FileKeys.forEach((key) => {
        let file = files[key];
        console.log(file);
        const FileNameToSave =
          uploadPath + uuid() + "." + file.name.split(".")[1];
        file.mv(process.cwd() + FileNameToSave, function (err) {
          if (err) return res.status(500).json(err);
        });
        filesSaved.push(FileNameToSave);
      });

      console.log(filesSaved);
      const FetchedPost = await post.findById(PostId);
      FetchedPost.images = [...filesSaved, ...FetchedPost.images];
      const updatedPost = await post.findByIdAndUpdate(
        PostId,
        {
          // $push: { image: { $each: [...filesSaved] } },
          images: FetchedPost.images,
        },
        {
          new: true,
          // upsert: true,
        }
      );
      console.log(updatedPost);
      const DataToSend = {
        staus: true,
        message: "Images uploaded successfully",
        images: updatedPost.images,
      };
      console.log("Data", DataToSend);
      res.status(200).json(DataToSend);
    } else {
      res.status(400).json({
        staus: false,
        message: "Request does not contain a image file",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;
