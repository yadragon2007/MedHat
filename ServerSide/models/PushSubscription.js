const mongoose = require("mongoose");

const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    expirationTime: {
      type: Number,
      default: null,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PushSubscription", PushSubscriptionSchema);
