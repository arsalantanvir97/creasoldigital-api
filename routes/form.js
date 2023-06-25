const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { v4: uuid } = require('uuid')
const { default: Stripe } = require('stripe')
const User = require('../model/user')
const Order = require('../model/order')
const { createNotification, NotificationType, GetUser } = require('../helpers')
const form = require('../model/form')

router.post('/form', auth, async (req, res) => {
  try {
    const { OrderId, questions } = req.body
    if (!OrderId) return res.status(400).json({ message: 'OrderId required.' })
    const FetchedOrder = await Order.findById(OrderId)
    if (FetchedOrder.form_status === 'Submitted')
      return res.status(400).json({ message: 'Form already submitted' })
    const UserId = FetchedOrder.user
    await Order.findByIdAndUpdate(OrderId, { form_status: 'Submitted' })
    const formToSave = await form.create({
      order: OrderId,
      user: UserId,
      questions,
    })
    const Notification = await createNotification({
      user: UserId,
      order: OrderId,
      notification_type: NotificationType.Submission,
      isAdmin: false,
    })

    return res.status(200).json({ message: 'Form submission successful.' })
  } catch (error) {
    return res.status(500).json(error)
  }
})

router.get('/form/:id?', auth, async (req, res) => {
  try {
    const OrderId = req.params.id
    if (!OrderId) return res.status(400).send('OrderId required.')
    console.log(OrderId)
    const formToSend = await form.findOne({ order: OrderId })
    console.log(formToSend)

    return res.status(200).json(formToSend)
  } catch (error) {
    console.log(error)
    return res.status(500).json(error)
  }
})

// router.get("/checkformstatus/:id?", auth, async (req, res) => {
//   try {
//     const OrderId = req.params.id;
//     if (!OrderId) return res.status(400).send("OrderId required.");
//     const formToSend = await form.find({ order: OrderID });
//     if (formToSend) {
//       return res.status(200).json();
//     } else {
//       return res.status(400).json();
//     }
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

module.exports = router
