import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { s3Manager } from "./manager/S3Manager";

const RESOLUTIONS = [
  { name: "240p", width: 426, height: 240 },
  { name: "480p", width: 854, height: 480 },
  { name: "720p", width: 1280, height: 720 },
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
};
