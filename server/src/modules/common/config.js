const multer = require("multer");
const path = require("path");
const fs = require("fs");

function getMulterUpload(tempDir) {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, tempDir),
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const ext = path.extname(file.originalname);
            cb(null, `temp_${timestamp}_${file.fieldname}${ext}`);
        }
    });
    return multer({ storage });
}

function ensureTempDir(tempDir) {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
}

module.exports = { getMulterUpload, ensureTempDir };
