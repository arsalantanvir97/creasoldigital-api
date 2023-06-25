const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Feedback = require('../model/feedback')
const { createNotification, NotificationType } = require('../helpers')

router.get('/feedback', auth, async (req, res) => {
  const { query } = req

  var page = parseInt(query.page) || 1 //for next page pass 1 here
  var perPage = parseInt(query.perPage) || 10

  var filter = {}
  if (query.q) {
    filter = { name: { $regex: query.q, $options: 'i' } }
  }

  var top = parseInt(query.top)
  if (!isNaN(top)) {
    perPage = top
    page = 1
  }

  const count = await Feedback.find(filter).countDocuments()

  const data = await Feedback.find(filter, query.fields ? query.fields : null, {
    limit: perPage,
    skip: (page - 1) * perPage,
  }).sort({ createdAt: -1 })

  res.status(200).send({
    total: count,
    data,
    currentPage: page,
    perPage,
    totalPages: Math.ceil(count / perPage),
    hasNextPage: page < Math.ceil(count / page),
    hasPrevPage: page > 1,
  })
})

router.post('/feedback', auth, async (req, res) => {
  try {
    const { user } = req
    // Get user input
    const { name, email, subject, description } = req.body

    // Validate user input
    if (!(name && email && subject && description)) {
      res.status(400).send('All inputs are required')
    }

    // Create feebback in our database
    const feedback = await Feedback.create({
      name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      subject,
      description,
    })

    const Notification = await createNotification({
      user: user.user_id,
      order: feedback._id,
      notification_type: NotificationType.Feedback,
      isAdmin: false,
    })
    console.log('Notification', Notification)
    // return new feedback
    res.status(201).json(feedback)
  } catch (err) {
    console.log(err)
  }
})

router.get('/feedback/:id', auth, async (req, res) => {
  try {
    // Get userid params
    const feedbackid = req.params.id
    console.log(feedbackid)
    const { query } = req
    // console.log(query);
    const feedback = await Feedback.findById(
      feedbackid,
      query.fields ? query.fields : null
    )
    // console.log(feedback);
    if (feedback) {
      res.status(200).json({
        feedback,
      })
    } else {
      res.status(404).json({
        message: 'Feedback not found',
      })
    }
  } catch (error) {
    res.status(500).json(error)
  }
})

module.exports = router
