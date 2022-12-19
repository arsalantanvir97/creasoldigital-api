const mongoose = require("mongoose");

const PackagesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: null },
  description: { type: Array, default: [] },
  duration: { type: String, required: true },
  interval: { type: String, required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model("packages", PackagesSchema);