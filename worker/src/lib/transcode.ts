import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { s3Manager } from "./manager/S3Manager";

const RESOLUTIONS = [
  { name: "240p", width: 426, height: 240 },
  { name: "480p", width: 854, height: 480 },
  { name: "720p", width: 1280, height: 720 },
];

const RESOLUTIONS_HLS = [
  { name: "240p", width: 426, height: 240, bitrate: "800k" },
  { name: "480p", width: 854, height: 480, bitrate: "1400k" },
  { name: "720p", width: 1280, height: 720, bitrate: "2800k" },
];

export const transcodeVideoWithFFmpeg = async (
  videoPath: string,
  fileName: string
) => {
  // Ensure the transcoded directory exists
  await fs.mkdir("transcoded", { recursive: true });

  const promises = RESOLUTIONS.map(async (resolution) => {
    const fileWithoutExtension = path.parse(fileName).name;
    const output = `transcoded/${fileWithoutExtension}_${resolution.name}.mp4`;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(output)
        .withVideoCodec("libx264")
        .withAudioCodec("aac")
        .size(`${resolution.width}x${resolution.height}`)
        .on("end", async () => {
          try {
            await s3Manager.uploadTranscodeVideoToS3(output);

            resolve(output);
          } catch (uploadError) {
            reject(new Error(`S3 upload failed for ${output}: ${uploadError}`));
          } finally {
            await fs.unlink(output);
          }
        })
        .on("error", (err) => {
          reject(
            new Error(
              `Transcoding error for ${resolution.name}: ${err.message}`
            )
          );
        })
        .format("mp4")
        .run();
    });
  });

  await Promise.all(promises);
  await fs.unlink(videoPath);
};

export const transcodeVideoToHLS = async (
  videoPath: string,
  fileName: string
) => {
  const fileWithoutExtension = path.parse(fileName).name;
  const outputDir = `transcoded/${fileWithoutExtension}`;

  try {
    await fs.mkdir(outputDir, { recursive: true });

    let masterPlaylist = "#EXTM3U\n";
    masterPlaylist += "#EXT-X-VERSION:3\n\n";

    // Process each resolution
    const promises = RESOLUTIONS_HLS.map(async (resolution) => {
      const variantDir = `${outputDir}/${resolution.name}`;
      await fs.mkdir(variantDir, { recursive: true });

      // Add this variant to master playlist
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${
        parseInt(resolution.bitrate) * 1000
      },RESOLUTION=${resolution.width}x${resolution.height}\n`;
      masterPlaylist += `${resolution.name}/playlist.m3u8\n\n`;

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            // HLS Output Options
            `-hls_time 10`, // 10 second segments
            `-hls_playlist_type vod`, // Video on demand
            `-hls_segment_filename ${variantDir}/segment%d.ts`, // Segment pattern
            `-hls_flags independent_segments`, // Independent segments for quality switching
            `-hls_list_size 0`, // Keep all segments in playlist

            // Video Encoding Options
            `-c:v h264`, // H.264 video codec
            `-preset fast`, // Encoding preset
            `-b:v ${resolution.bitrate}`, // Video bitrate
            `-maxrate ${resolution.bitrate}`, // Max bitrate
            `-bufsize ${parseInt(resolution.bitrate) * 2}k`, // Buffer size
            `-s ${resolution.width}x${resolution.height}`, // Resolution

            // Audio Encoding Options
            `-c:a aac`, // AAC audio codec
            `-b:a 128k`, // Audio bitrate
            `-ar 48000`, // Audio sample rate
          ])
          .output(`${variantDir}/playlist.m3u8`)
          .on("end", async () => {
            try {
              // Upload segments and playlist to S3
              const files = await fs.readdir(variantDir);
              for (const file of files) {
                const filePath = `${variantDir}/${file}`;
                await s3Manager.uploadHLSFileToS3(
                  filePath,
                  `${fileWithoutExtension}/${resolution.name}/${file}`
                );
                await fs.unlink(filePath);
              }
              resolve(variantDir);
            } catch (uploadError) {
              reject(
                new Error(`S3 upload failed for ${variantDir}: ${uploadError}`)
              );
            }
          })
          .on("error", (err) => {
            reject(
              new Error(
                `Transcoding error for ${resolution.name}: ${err.message}`
              )
            );
          })
          .run();
      });
    });

    // Wait for all transcoding to complete
    await Promise.all(promises);

    // Write and upload master playlist
    const masterPlaylistPath = `${outputDir}/master.m3u8`;
    await fs.writeFile(masterPlaylistPath, masterPlaylist);
    await s3Manager.uploadHLSFileToS3(
      masterPlaylistPath,
      `${fileWithoutExtension}/master.m3u8`
    );

    // Clean up
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.unlink(videoPath);

    return true;
  } catch (error) {
    console.error("HLS transcoding failed:", error);
    // Clean up on error
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
    throw error;
  }
};

export const transcodeVideoToHLS2 = async (
  videoPath: string,
  fileName: string
) => {
  const fileWithoutExtension = path.parse(fileName).name;
  const outputDir = path.resolve(`transcoded/${fileWithoutExtension}`);

  try {
    // Create output directory structure
    await fs.mkdir(outputDir, { recursive: true });

    // Generate master playlist content
    let masterPlaylist = "#EXTM3U\n";
    masterPlaylist += "#EXT-X-VERSION:3\n\n";

    // Process each resolution
    const promises = RESOLUTIONS_HLS.map(async (resolution) => {
      const variantDir = path.resolve(`${outputDir}/${resolution.name}`);
      await fs.mkdir(variantDir, { recursive: true });

      // Add this variant to master playlist
      const bandwidth = parseInt(resolution.bitrate) * 1000;
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution.width}x${resolution.height}\n`;
      masterPlaylist += `${resolution.name}/playlist.m3u8\n\n`;

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            // HLS Output Options
            `-hls_time 10`,
            `-hls_playlist_type vod`,
            `-hls_segment_filename`,
            `${variantDir}/segment%d.ts`,
            `-hls_flags independent_segments`,
            `-hls_list_size 0`,

            // Video Encoding Options
            `-c:v libx264`,
            `-preset fast`,
            `-b:v ${resolution.bitrate}`,
            `-maxrate ${resolution.bitrate}`,
            `-bufsize ${parseInt(resolution.bitrate) * 2}k`,
            `-s ${resolution.width}x${resolution.height}`,

            // Audio Encoding Options
            `-c:a aac`,
            `-b:a 128k`,
            `-ar 48000`,

            // Force key frames
            `-force_key_frames expr:gte(t,n_forced*2)`,
          ])
          .output(`${variantDir}/playlist.m3u8`)
          .on("start", (command) => {
            console.log(
              `Starting transcoding for ${resolution.name}: ${command}`
            );
          })
          .on("end", async () => {
            try {
              console.log(`Transcoding complete for ${resolution.name}`);

              // Verify files exist before uploading
              const files = await fs.readdir(variantDir);

              console.log(`Found ${files.length} files in ${variantDir}`);

              for (const file of files) {
                const filePath = path.join(variantDir, file);
                const s3Key = `${fileWithoutExtension}/${resolution.name}/${file}`;

                // Verify file exists and is readable
                await fs.access(filePath, fs.constants.R_OK);

                console.log(`Uploading ${filePath} to S3 as ${s3Key}`);
                await s3Manager.uploadHLSFileToS3(filePath, s3Key);
                await fs.unlink(filePath);
              }

              resolve(variantDir);
            } catch (uploadError) {
              console.error(
                `Upload error for ${resolution.name}:`,
                uploadError
              );
              reject(
                new Error(`S3 upload failed for ${variantDir}: ${uploadError}`)
              );
            }
          })
          .on("error", (err) => {
            console.error(`Transcoding error for ${resolution.name}:`, err);
            reject(
              new Error(
                `Transcoding error for ${resolution.name}: ${err.message}`
              )
            );
          })
          .run();
      });
    });

    // Wait for all transcoding to complete
    await Promise.all(promises);

    // Write and upload master playlist
    const masterPlaylistPath = path.join(outputDir, "master.m3u8");
    await fs.writeFile(masterPlaylistPath, masterPlaylist);

    console.log("Uploading master playlist to S3");
    await s3Manager.uploadHLSFileToS3(
      masterPlaylistPath,
      `${fileWithoutExtension}/master.m3u8`
    );

    // Clean up
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.unlink(videoPath);

    return true;
  } catch (error) {
    console.error("HLS transcoding failed:", error);
    // Clean up on error
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
    throw error;
  }
};
