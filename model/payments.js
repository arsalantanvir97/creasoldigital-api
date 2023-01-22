const mongoose = require("mongoose");

const Payment = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      required: true,
    },
    payment_type: { type: String, required: true },
    amount: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("payments", Payment);
