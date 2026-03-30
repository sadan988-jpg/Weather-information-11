const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
    city: String,
    temperature: Number,
    description: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Weather', weatherSchema);
