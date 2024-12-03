const { Client } = require('minio');
const dotenv = require('dotenv');
dotenv.config();

const sourceBucket = process.env.SOURCE_BUCKET;
const destinationBucket = process.env.DESTINATION_BUCKET;

console.log('Source Bucket:', process.env.SOURCE_BUCKET);
console.log('Destination Bucket:', process.env.DESTINATION_BUCKET);


if (!sourceBucket || !destinationBucket) {
    throw new Error('Bucket names are not defined in environment variables.');
}

const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT, 10),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

minioClient.bucketExists(process.env.SOURCE_BUCKET, (err, exists) => {
    if (err) {
        console.error('Error checking bucket existence:', err);
        return;
    }
    if (!exists) {
        minioClient.makeBucket(process.env.SOURCE_BUCKET, '', (err) => {
            if (err) console.error('Error creating bucket:', err);
            else console.log('Source bucket created successfully.');
        });
    }
});

minioClient.bucketExists(process.env.DESTINATION_BUCKET, (err, exists) => {
    if (err) {
        console.error('Error checking bucket existence:', err);
        return;
    }
    if (!exists) {
        minioClient.makeBucket(process.env.DESTINATION_BUCKET, '', (err) => {
            if (err) console.error('Error creating bucket:', err);
            else console.log('Destination bucket created successfully.');
        });
    }
});


module.exports = minioClient;
