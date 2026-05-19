const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
    city: String,
    temperatures: [Number],
    times: [String],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Weather', weatherSchema);
