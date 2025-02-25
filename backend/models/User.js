const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
  fundingLinkId: {
    type: String,
    default: uuidv4,
    unique: true,
  }, // Unique funding link ID
  apiKey: { type: String, default: uuidv4, unique: true }, // Unique API key
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('User', userSchema)
