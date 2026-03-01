const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    userId: { type: String },
    userName: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SessionLog', sessionLogSchema);
