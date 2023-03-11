const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        package: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "package",
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "order",
        },
        subscription_id: { type: String, required: true },
        status: { type: String, default: "ACTIVE" },
        // cancelledAt: {type: Date}
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("usersubscription", userSubscriptionSchema);
