import multer from "multer";
import ApiError from "../utils/ApiError.js";

const MAX_BYTES = 1024 * 1024;

const isCsv = (file) =>
  file.originalname.toLowerCase().endsWith(".csv") ||
  ["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"].includes(
    file.mimetype
  );

const csv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!isCsv(file)) {
      return callback(new ApiError(400, "Import file must be a CSV"));
    }
    return callback(null, true);
  },
});

export const csvUpload = csv.single("file");
