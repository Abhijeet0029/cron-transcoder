const { createMinioClient } = require('../config/minioClient');
const { ensureDirectoryExists } = require('./fileService');
require('dotenv').config();

async function uploadToMinio(file, bucketName) {
    const minioClient = createMinioClient();
    ensureDirectoryExists(process.env.VIDEO_UPLOAD_DIR);

    try {
        const metaData = {
            'Content-Type': file.mimetype
        };

        await minioClient.fPutObject(
            bucketName,
            file.filename,
            file.path,
            metaData
        );
        return file.filename;
    } catch (error) {
        console.error('Minio upload error:', error);
        throw error;
    }
}

async function getPresignedUrl(bucketName, objectName) {
    const minioClient = createMinioClient();
    try {
        const url = await minioClient.presignedPutObject(bucketName, objectName);
        return url;
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw error;
    }
}

module.exports = {
    uploadToMinio,
    getPresignedUrl
};