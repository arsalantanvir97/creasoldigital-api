const mongoose = require('mongoose')

const PackagesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: null },
    description: { type: Array, default: [] },
    totalposts: { type: String, required: true },
    duration: { type: String, required: true, default: '2' },

    interval: { type: String, required: true },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('packages', PackagesSchema)
