const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    originalName: String,
    minioUrl: String,
    dashManifest: String,
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Video', videoSchema);
