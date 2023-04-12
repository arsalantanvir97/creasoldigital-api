const express = require("express");
const { NotificationType, createNotification, GetUser } = require("../helpers");
const router = express.Router();
const auth = require("../middleware/auth");

const comment = require("../model/comment");
const post = require("../model/post");

// Add Comment
router.post("/comment", auth, async (req, res) => {
  const commentToAdd = { ...req.body };
  try {
    const authUser = await GetUser(req.user.user_id);
    const newlyAddedComment = await (
      await comment.create(commentToAdd)
    ).populate("user");
    let fetchedPost
    if(authUser.is_admin){
       fetchedPost = await post.findByIdAndUpdate(
        commentToAdd.post,
        {
          $push: { comments: newlyAddedComment._id },
        },
        { new: true, upsert: true }
      );
    }else{
     fetchedPost = await post.findByIdAndUpdate(
      commentToAdd.post,
      {
        $push: { comments: newlyAddedComment._id },
        status: "Rejected with Comments",
      },
      { new: true, upsert: true }
    )}
    console.log(commentToAdd);
    console.log(newlyAddedComment);
    console.log(fetchedPost);

    // Sending Notification
    let NotificationData = {};
    // User will see those notification in which isAdmin is true and user fields of the notification matched with the logged in user.
    if (authUser.is_admin) {
      NotificationData = {
        created_by: authUser._id,
        user: fetchedPost.user._id,
        post: newlyAddedComment.post,
        order: fetchedPost.order,
        notification_type: NotificationType.Comment,
        isAdmin: authUser.is_admin,
      };
    } else {
      NotificationData = {
        user: authUser._id,
        post: newlyAddedComment.post,
        order: fetchedPost.order,
        notification_type: NotificationType.Rejected,
        isAdmin: false,
      };
    }
    const Notification = await createNotification(NotificationData);
    return res.status(201).json(newlyAddedComment);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;
