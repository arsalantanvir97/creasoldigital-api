const { response } = require("express");
const express = require("express");
const { GetUser } = require("../helpers");
const router = express.Router();
const auth = require("../middleware/auth");
const notification = require("../model/notification");
const User = require("../model/user");

router.get("/users", auth, async (req, res) => {
  const { query } = req;

  var page = parseInt(query.page) || 1; //for next page pass 1 here

  var perPage = parseInt(query.perPage) || 10;

  const searchParam = query.q
  ? // { $text: { $search: req.query.searchString } }
  {
    $or: [
      { first_name: { '$regex': query.q, '$options': 'i' } },
    { last_name: { '$regex': query.q, '$options': 'i' } },
    { email: { '$regex': query.q, '$options': 'i' } }
    ],
  }
  : {}
  var top = parseInt(query.top);
  if (!isNaN(top)) {
    perPage = top;
    page = 1;
  }
  console.log('q',query.q,typeof(query.q))
  filter.is_admin = false;
  const count = await User.find(searchParam).countDocuments();

  const data = await User.find(searchParam, null, {
    limit: perPage,
    skip: (page - 1) * perPage,
  }).sort({"createdAt": -1});

  res.status(200).send({
    total: count,
    data,
    currentPage: page,
    perPage,
    totalPages: Math.ceil(count / perPage),
    hasNextPage: page < Math.ceil(count / page),
    hasPrevPage: page > 1,
  });
});

// router.post("/users", (req, res) => {
//   // create user
// });

// router.get("/users/:id", (req, res) => {
//   // get a user
// });

router.put("/users", auth, async (req, res) => {
  // update a user

  // const userID = req.params.id;
  const userID = req.user.user_id;
  const updateFields = { ...req.body };
  delete updateFields.password;
  delete updateFields.createdAt;
  delete updateFields.image;

  try {
    const updatedUser = await User.findByIdAndUpdate(userID, updateFields, {
      new: true,
    });
    delete updatedUser.password;
    res.status(202).send({
      status: true,
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.put("/users-edited-admin", auth, async (req, res) => {
  // update a user

  // const userID = req.params.id;

  try {
    const authUser = await GetUser(req.user.user_id);
    if (!authUser.is_admin) return res.status(401).send("Unauthorized");
    const userID = req.body.user_id;
    const updateFields = { ...req.body };
    delete updateFields.password;
    delete updateFields.createdAt;
    delete updateFields.image;
    const updatedUser = await User.findByIdAndUpdate(userID, updateFields, {
      new: true,
    });
    delete updatedUser.password;
    res.status(202).send({
      status: true,
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.put("/test", async (req, res) => {
  const sampleFile = req.files.sampleFile;
  const uploadPath =
    process.cwd() + "/images/" + "userID" + "." + sampleFile.name.split(".")[1];
  sampleFile.mv(uploadPath, function (err) {
    if (err) return res.status(500).send(err);
    res.send(sampleFile.name.split(".")[1]);
  });
});

router.put("/profile-image", auth, async (req, res) => {
  try {
    if (req.files) {
      const userID = req.user.user_id;
      const profileImage = req.files.profile;
      const profileImageName = userID + "." + profileImage.name.split(".")[1];
      const uploadPath = process.cwd() + "/images/" + profileImageName;
      req.body.image = "/profiles/" + profileImageName;
      profileImage.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
      const updatedUser = await User.findByIdAndUpdate(
        userID,
        { image: req.body.image },
        {
          new: true,
        }
      );
      res.status(202).json({
        staus: true,
        message: "File uploaded successfully",
        image: req.body.image,
      });
    } else {
      res.status(200).json({
        staus: false,
        message: "Request does not contain a file",
      });
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.put("/change-user-image-by-admin", auth, async (req, res) => {
  try {
    const authUser = await GetUser(req.user.user_id);
    if (!authUser.is_admin) return res.status(401).send("Unauthorized");
    if (req.files) {
      console.log(req.body.user_id);
      const userID = req.body.user_id;
      const profileImage = req.files.profile;
      const profileImageName = userID + "." + profileImage.name.split(".")[1];
      const uploadPath = process.cwd() + "/images/" + profileImageName;
      req.body.image = "/profiles/" + profileImageName;
      profileImage.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
      const updatedUser = await User.findByIdAndUpdate(
        userID,
        { image: req.body.image },
        {
          new: true,
        }
      );
      res.status(202).json({
        staus: true,
        message: "File uploaded successfully",
        image: req.body.image,
      });
    } else {
      res.status(200).json({
        staus: false,
        message: "Request does not contain a file",
      });
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.get("/user/:id?", auth, async (req, res) => {
  const authUser = await GetUser(req.user.user_id);
  console.log(authUser);
  if (!authUser.is_admin) return res.status(401).send("Unauthorized");
  const userId = req.params.id;
  const user = await GetUser(userId);
  return res.status(200).json(user);
});

router.get("/notification", auth, async (req, res) => {
  try {
    const authUser = await GetUser(req.user.user_id);
    let Notification;
    if (authUser.is_admin) {
     await notification.updateMany({}, {$set: {isRead: true}})

      // Admin will always get notification where isAdmin field of notification is false
      Notification = await notification
        .find({ isAdmin: false })
        .populate({
          path: "user",
          select: "-password",
        })
        .populate({
          path: "created_by",
          select: "-password",
        });
      // .exec(function (err, items) {
      //   if (err) console.log(err);
      //   Notification = items;
      //   console.log(Notification);
      // });
    } else {
      // Admin will always get notification where isAdmin field of notification is true and also the user field of the notification is matched with authUser._id
      Notification = await notification
        .where("isAdmin")
        .equals(true)
        .where("user")
        .equals(authUser._id)
        .populate({
          path: "user",
          select: "-password",
        })
        .populate({
          path: "created_by",
          select: "-password",
        });
    }
    Notification.sort(function (a, b) {
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return res.status(200).json(Notification);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

// router.delete("/users/:id", (req, res) => {
//   // delete user
// });

// router.get("/users", (req, res) => {
//   // all users with maybe pagination
// });

module.exports = router;

// POST -> CREATE
// GET -> RETERIVE RECORD
// PUT/PATCH -> UPDATE
// PUT -> MULTIPLE UPDATE
// PATCH -> PATCH A SINGLE FIELD
// DELETE -> DELETE
