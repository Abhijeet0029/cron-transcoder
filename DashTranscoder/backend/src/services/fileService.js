const fs = require('fs');
const path = require('path');

function ensureDirectoryExists(directory) {
    try {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
            console.log(`Created directory: ${directory}`);
        }
    } catch (error) {
        console.error(`Directory creation error: ${directory}`, error);
        throw error;
    }
}

function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error(`File deletion error: ${filePath}`, error);
    }
}

function validateFileSize(file, maxSizeBytes) {
    if (file.size > maxSizeBytes) {
        throw new Error(`File size exceeds limit of ${maxSizeBytes / (1024 * 1024)}MB`);
    }
}

module.exports = {
    ensureDirectoryExists,
    deleteFile,
    validateFileSize
};