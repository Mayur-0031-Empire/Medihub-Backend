import multer from "multer";
import fs from "fs";
import path from "path";

const tempUploadDir = path.join(process.cwd(), "public", "temp");

const ensureTempUploadDir = () => {
  if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureTempUploadDir();
    cb(null, tempUploadDir);
  },
  filename(_req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

export { upload };
