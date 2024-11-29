import ffmpeg from "fluent-ffmpeg";

const RESOLUTIONS = [
  { name: "240p", width: 426, height: 240 },
  { name: "480p", width: 854, height: 480 },
  { name: "720p", width: 1280, height: 720 },
];

export const transcodeVideoWithFFmpeg = async (
  videoPath: string,
  fileName: string
) => {
  const promises = RESOLUTIONS.map(async (resolution) => {
    const output = `transcoded/${resolution.name}/${fileName}`;
    return new Promise((resolve) => {
      ffmpeg(videoPath)
        .output(output)
        .withVideoCodec("libx264")
        .withAudioCodec("aac")
        .size(`${resolution.width}x${resolution.height}`)
        .on("end", () => {
          resolve(output);
        })
        .format("mp4")
        .run();
    });
  });

  await Promise.all(promises);

  // upload the videos
};
