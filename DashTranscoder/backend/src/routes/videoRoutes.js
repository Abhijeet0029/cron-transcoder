const cron = require('node-cron');
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const dotenv = require('dotenv');
const minioClient = require('../config/minioClient');
const Video = require('../models/video');
dotenv.config();

const upload = multer({ dest: 'uploads/' });


// router.post('/upload', upload.single('video'), async (req, res) => {
//     console.log('Bucket name before upload:', process.env.SOURCE_BUCKET);
//     const { file } = req;

//     if (!file) return res.status(400).send('No file uploaded.');

//     try {
//         const objectName = `${Date.now()}-${file.originalname}`;
//         console.log('Object name:', objectName);

//         if (!fs.existsSync(file.path)) {
//             console.error('Uploaded file does not exist:', file.path)
//             return res.status(500).send('Uploaded file is missing.')
//         }

//         await minioClient.fPutObject(process.env.SOURCE_BUCKET, objectName, file.path)
//         const minioUrl = await minioClient.presignedGetObject(process.env.SOURCE_BUCKET, objectName)
//         console.log('Generated presigned URL:', minioUrl)

//         const video = new Video({ originalName: file.originalname, minioUrl });
//         await video.save();

//         const outputDir = path.resolve(__dirname, 'output', objectName.split('.')[0]);
//         if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

//         // const dashManifest = path.join(outputDir, 'output.mpd');
//         const dashManifest = path.join(outputDir, `${path.basename(file.originalname, path.extname(file.originalname))}.mpd`)
//         console.log('Dash manifest path:', dashManifest)

//         ffmpeg(file.path)
//             .outputOptions([
//                 '-profile:v baseline',
//                 '-level 3.0',
//                 '-start_number 0',
//                 '-hls_time 10',
//                 '-hls_list_size 0',
//                 '-f dash',
//             ])
//             .output(dashManifest)
//             .on('end', async () => {
//                 video.dashManifest = dashManifest;
//                 await video.save();

//                 if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
//                 res.status(201).send({
//                     message: 'File uploaded and transcoded successfully.',
//                     video,
//                     // video: {
//                     //     originalName: video.originalName,
//                     //     minioUrl: video.minioUrl,
//                     //     dashManifest: video.dashManifest,
//                     // },
//                 });

//                 scheduleDashUpload(video, dashManifest) // Delay
//             })
//             .on('error', (err) => {
//                 console.error('Error during transcoding:', err)
//                 if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
//                 res.status(500).send('Error in transcoding file.');
//             })
//             .run();
//     } catch (err) {
//         console.error('Error in upload api:', err);
//         res.status(500).send('Error uploading video.');
//     }
// });


// const scheduleDashUpload = (video, dashManifest) => {
//     console.log('Scheduling upload for:', video.originalName);

//     setTimeout(async () => {
//         try {
//             console.log(`Starting DASH upload for ${video.originalName}`)

//             const outputDir = path.dirname(dashManifest);
//             const files = fs.readdirSync(outputDir);

//             for (const file of files) {
//                 const filePath = path.join(outputDir, file);
//                 await minioClient.fPutObject(
//                     process.env.DESTINATION_BUCKET,
//                     `${video.originalName.split('.')[0]}/${file}`,
//                     filePath
//                 );
//             }

//             console.log('DASH files uploaded to destination-bucket.');
//         } catch (err) {
//             console.error('Error uploading DASH files to destination-bucket:', err);
//         }
//     }, 1 * 60 * 1000) // 1 min delay, for testing
// };

router.post('/upload', upload.single('video'), async (req, res) => {
    console.log('Bucket name before upload:', process.env.SOURCE_BUCKET);
    const { file } = req;

    if (!file) return res.status(400).send('No file uploaded.');

    try {
        const objectName = `${Date.now()}-${file.originalname}`;
        console.log('Object name:', objectName);

        if (!fs.existsSync(file.path)) {
            console.error('Uploaded file does not exist:', file.path);
            return res.status(500).send('Uploaded file is missing.');
        }

        await minioClient.fPutObject(process.env.SOURCE_BUCKET, objectName, file.path);
        const minioUrl = await minioClient.presignedGetObject(process.env.SOURCE_BUCKET, objectName);
        console.log('Generated presigned URL:', minioUrl);

        const video = new Video({ originalName: file.originalname, minioUrl });
        await video.save();

        const outputDir = path.resolve(__dirname, 'output', objectName.split('.')[0]);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const dashManifestFileName = `${path.basename(file.originalname, path.extname(file.originalname))}.mpd`;
        const dashManifestPath = path.join(outputDir, dashManifestFileName);
        console.log('Dash manifest path:', dashManifestPath);

        ffmpeg(file.path)
            .outputOptions([
                '-profile:v baseline',
                '-level 3.0',
                '-start_number 0',
                '-hls_time 10',
                '-hls_list_size 0',
                '-f dash',
            ])
            .output(dashManifestPath)
            .on('end', async () => {
                video.dashManifest = dashManifestPath;
                await video.save();

                if (fs.existsSync(file.path)) fs.unlinkSync(file.path); // Cleanup

                scheduleDashUpload(video, dashManifestPath)
                    .then((dashPresignedUrl) => {
                        res.status(201).send({
                            message: 'File uploaded and transcoded successfully.',
                            video: {
                                originalName: video.originalName,
                                minioUrl: video.minioUrl,
                                dashManifestUrl: dashPresignedUrl,
                            },
                        });
                    })
                    .catch((err) => {
                        console.error('Error scheduling DASH upload:', err);
                        res.status(500).send('Error in DASH upload.');
                    });
            })
            .on('error', (err) => {
                console.error('Error during transcoding:', err);
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path); // Cleanup
                res.status(500).send('Error in transcoding file.');
            })
            .run();
    } catch (err) {
        console.error('Error in upload API:', err);
        res.status(500).send('Error uploading video.');
    }
});

const scheduleDashUpload = async (video, dashManifestPath) => {
    console.log('Scheduling upload for:', video.originalName);

    const outputDir = path.dirname(dashManifestPath);
    const dashFiles = fs.readdirSync(outputDir);

    // Upload all DASH-related files to MinIO
    for (const file of dashFiles) {
        const filePath = path.join(outputDir, file);
        const destinationPath = `${video.originalName.split('.')[0]}/${file}`;
        console.log(`Uploading ${file} to MinIO: ${destinationPath}`);
        await minioClient.fPutObject(process.env.DESTINATION_BUCKET, destinationPath, filePath);
    }

    // await new Promise((resolve, reject) => setTimeout(reject, 1 * 60 * 1000, new Error('Error while scheduling DASH upload testing 1 min delay')));

    // Generate a presigned URL for the .mpd file
    const dashManifestFileName = path.basename(dashManifestPath);
    const presignedUrl = await minioClient.presignedGetObject(
        process.env.DESTINATION_BUCKET,
        `${video.originalName.split('.')[0]}/${dashManifestFileName}`
    );

    console.log('Generated DASH manifest presigned URL:', presignedUrl);
    return presignedUrl;
};



module.exports = router;