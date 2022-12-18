const mongoose = require("mongoose");

const forgetPasswordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  code: { type: String, default: null },
}, {
    timestamps: true
});

module.exports = mongoose.model("forgetpassword", forgetPasswordSchema);