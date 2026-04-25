const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 150 },
    gender: { type: String, enum: ["male", "female"] },
    blood_type: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    emergency_contact: [
      {
        name: { type: String, trim: true },
        relation: { type: String, trim: true },
        phone: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true },
);
const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
