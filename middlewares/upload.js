const multer = require("multer");
const path = require("path");

const tempDir = path.join(__dirname, "../", "tmp", "uploads");

const multerConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // cb(null, file.fieldname + "-" + uniqueSuffix);
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: multerConfig });

module.exports = upload;
