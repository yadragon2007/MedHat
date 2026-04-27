const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A report title is required"],
      trim: true,
    },
    datetime: {
      type: Date,
      required: [true, "Date and time are required"],
      default: Date.now,
    },
    // Heart Rate Statistics
    maxBpm: {
      type: Number,
      required: true,
      min: 0,
    },
    minBpm: {
      type: Number,
      required: true,
      min: 0,
    },
    avgBpm: {
      type: Number,
      required: true,
      min: 0,
    },
    // General Condition using an Enumerator to match your frontend selection
    condition: {
      type: String,
      required: true,
      enum: [
        "EXCELLENT",
        "STABLE",
        "RECOVERING",
        "ELEVATED",
        "BRADYCARDIA",
        "ARRHYTHMIA",
        "CRITICAL",
      ],
      default: "STABLE",
    },
    notes: {
      type: String,
      trim: true,
      default: "No clinical observations recorded.",
    },
  },
  {
    timestamps: true, // Automatically creates 'createdAt' and 'updatedAt' fields
  },
);

module.exports = mongoose.model("Report", ReportSchema);
