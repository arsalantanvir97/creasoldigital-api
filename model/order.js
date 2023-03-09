const mongoose = require("mongoose");

const Order = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "posts",
      },
    ],
    payment_type: { type: String, required: true },
    pkg_name: { type: String, required: true },
    pkg_price: { type: Number, default: null },
    pkg_description: { type: Array, default: [] },
    pkg_duration: { type: String, required: true },
    pkg_interval: { type: String, required: true },
    medium: { type: String, required: true },
    form_status: { type: String, required: true },
    status: { type: String, required: true },
    form_filltime: {
      type: Date,
      // Added 23 hour 59 minutes to the current date
      default: new Date(new Date().getTime() + 60 * 60 * 24 * 1000 - 1),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("orders", Order);
