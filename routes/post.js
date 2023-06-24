const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

const User = require('../model/user')
const comment = require('../model/comment')
const Order = require('../model/order')
const post = require('../model/post')
const { v4: uuid } = require('uuid')
const { GetUser, NotificationType, createNotification } = require('../helpers')

// Get a single post
router.get('/post/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const PostToSend = await post
      .findById(id)
      .populate('user')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: '-password',
          model: 'user',
        },
      })
    console.log('Post Fetched')
    console.log(PostToSend)
    return res.status(200).json(PostToSend)
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})

// Create a post
router.post('/post', auth, async (req, res) => {
  try {
    const { OrderId, title, description, status, post_medium } = req.body
    const RelatedOrder = await Order.findById(OrderId)
    // User to which this order belong
    if (!RelatedOrder) {
      return res.status(400).json({ message: 'Order not exist!' })
    }
    const user = RelatedOrder.user
    console.log(RelatedOrder)
    const PostToAdd = {
      user,
      title,
      description,
      status,
      post_medium,
      order: RelatedOrder._id,
    }
    const NewlyAddedPost = await post.create(PostToAdd)
    const authUserr = await GetUser(req.user.user_id)

    let NotificationData = {
      created_by: authUserr._id,
      user: NewlyAddedPost.user,
      post: NewlyAddedPost._id,
      order: NewlyAddedPost.order,
      notification_type: NotificationType.Created,
      isAdmin: true,
    }
    const Notification = await createNotification(NotificationData)

    if (req.files) {
      const authUser = await GetUser(req.user.user_id)
      const { files } = req
      console.log(files['profile[0]'])
      const FileKeys = Object.keys(files)
      console.log(FileKeys)
      const uploadPath = '/post-images/' + NewlyAddedPost._id + '_'
      const filesSaved = []
      FileKeys.forEach((key) => {
        let file = files[key]
        console.log(file)
        const FileNameToSave =
          uploadPath + uuid() + '.' + file.name.split('.')[1]
        file.mv(process.cwd() + FileNameToSave, function (err) {
          if (err) return res.status(500).json(err)
        })
        filesSaved.push(FileNameToSave)
      })

      console.log(filesSaved)
      const FetchedPost = await post.findById(NewlyAddedPost._id)
      FetchedPost.images = filesSaved
      const updatedPost = await post.findByIdAndUpdate(
        NewlyAddedPost._id,
        {
          // $push: { image: { $each: [...filesSaved] } },
          images: FetchedPost.images,
        },
        {
          new: true,
          // upsert: true,
        }
      )
      console.log(updatedPost)
    }

    RelatedOrder.posts.push(NewlyAddedPost._id)
    await Order.findByIdAndUpdate(OrderId, { posts: RelatedOrder.posts })
    return res.status(201).json(NewlyAddedPost)
    // return res.status(201).json({});
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})

router.put('/post/:id?', auth, async (req, res) => {
  try {
    const authUser = await GetUser(req.user.user_id)
    const { id } = req.params
    // const { title, description, status, post_medium } = req.body;
    console.log(id)
    console.log({ ...req.body })
    const updatedPost = await post.findByIdAndUpdate(
      id,
      { ...req.body },
      {
        new: true,
      }
    )
    console.log(updatedPost)
    // Sending Notification
    let NotificationData = {}
    // User will see those notification in which isAdmin is true and user fields of the notification matched with the logged in user.
    if (authUser.is_admin) {
      NotificationData = {
        created_by: authUser._id,
        user: updatedPost.user,
        post: updatedPost._id,
        order: updatedPost.order,
        notification_type: NotificationType.PostUpdate,
        isAdmin: authUser.is_admin,
      }
    } else {
      NotificationData = {
        user: authUser._id,
        post: updatedPost._id,
        order: updatedPost.order,
        notification_type: NotificationType.Approved,
        isAdmin: false,
      }
    }
    const Notification = await createNotification(NotificationData)
    return res.status(204).json(updatedPost)
  } catch (error) {
    return res.status(500).json(error)
  }
})

router.put('/post-images/:id?', auth, async (req, res) => {
  try {
    const { id: PostId } = req.params
    if (req.files) {
      const authUser = await GetUser(req.user.user_id)
      const { files } = req
      console.log(files['profile[0]'])
      const FileKeys = Object.keys(files)
      console.log(FileKeys)
      const uploadPath = '/post-images/' + PostId + '_'
      const filesSaved = []
      FileKeys.forEach((key) => {
        let file = files[key]
        console.log(file)
        const FileNameToSave =
          uploadPath + uuid() + '.' + file.name.split('.')[1]
        file.mv(process.cwd() + FileNameToSave, function (err) {
          if (err) return res.status(500).json(err)
        })
        filesSaved.push(FileNameToSave)
      })

      console.log(filesSaved)
      const FetchedPost = await post.findById(PostId)
      FetchedPost.images = [...filesSaved, ...FetchedPost.images]
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
      )
      console.log(updatedPost)
      const DataToSend = {
        staus: true,
        message: 'Images uploaded successfully',
        images: updatedPost.images,
      }
      console.log('Data', DataToSend)

      // Sending Notification
      let NotificationData = {}
      // User will see those notification in which isAdmin is true and user fields of the notification matched with the logged in user.
      if (authUser.is_admin) {
        NotificationData = {
          created_by: authUser._id,
          user: updatedPost.user,
          post: updatedPost._id,
          order: updatedPost.order,
          notification_type: NotificationType.PostUpdate,
          isAdmin: authUser.is_admin,
        }
      }
      // else {
      //   NotificationData = {
      //     user: authUser._id,
      //     post: updatedPost._id,
      //     order: updatedPost.order,
      //     notification_type: NotificationType.PostUpdate,
      //     isAdmin: false,
      //   };
      // }
      const Notification = await createNotification(NotificationData)

      res.status(200).json(DataToSend)
    } else {
      res.status(400).json({
        staus: false,
        message: 'Request does not contain a image file',
      })
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})

router.put('/delete-image/:id?', auth, async (req, res) => {
  const { id } = req.params
  const { index } = req.body

  try {
    const updatedPost = await post.findById(id)
    console.log('id', updatedPost, index)
    updatedPost.images = updatedPost.images.splice(index, 1)
    updatedPost.save()
    const updatedPost2 = await post.findById(id)
    const DataToSend = {
      staus: true,
      message: 'Images updated successfully',
      images: updatedPost2.images,
    }

    res.status(200).json(DataToSend)
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})

module.exports = router
