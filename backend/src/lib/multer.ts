import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import fs from "fs";

const uploadsDir = path.resolve(__dirname, "../uploads/videos");

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Uploads directory created or already exists: ${uploadsDir}`);
} catch (error) {
  console.error("Failed to create uploads directory:", error);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only MP4, MPEG, and QuickTime videos are allowed."
        )
      );
    }
  },
});
