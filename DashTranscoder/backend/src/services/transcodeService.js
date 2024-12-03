const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { ensureDirectoryExists } = require('./fileService');
require('dotenv').config();

function transcodeVideoToDash(inputPath, outputDir) {
    ensureDirectoryExists(outputDir);

    return new Promise((resolve, reject) => {
        const outputBase = path.basename(inputPath, path.extname(inputPath));
        // console.log('outputBase: ', outputBase);
        const outputMpdPath = path.join(outputDir, `${outputBase}.mpd`);
        const segmentPattern = path.join(outputDir, `${outputBase}_%05d.m4s`);

        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264',
                '-preset medium',
                '-b:v 2000k',
                '-maxrate 2000k',
                '-bufsize 4000k',
                '-c:a aac',
                '-b:a 128k',
                '-map 0',
                '-f dash',
                '-use_template 1',
                '-use_timeline 1',
                `-init_seg_name ${outputDir}/init.mp4`,
                `-media_seg_name ${outputDir}/chunk-%d.m4s`,
                '-seg_duration 4'
            ])
            .on('start', (commandLine) => {
                console.log('FFmpeg command line:', commandLine)
            })
            .output(outputMpdPath)
            .on('end', () => {
                console.log('DASH transcoding completed');
                resolve({ mpdPath: outputMpdPath, baseName: outputBase });
            })
            .on('error', (err) => {
                console.error('Transcoding error:', err);
                reject(err);
            })
            .run();
    });
}

module.exports = {
    transcodeVideoToDash
};
