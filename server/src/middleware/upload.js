import multer from "multer";
import ApiError from "../utils/ApiError.js";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const avatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return callback(
        new ApiError(400, "Avatar must be a JPEG, PNG or WebP image")
      );
    }
    return callback(null, true);
  },
});

export const avatarUpload = avatar.single("avatar");
