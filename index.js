const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static("public"));

// Create upload folder if not exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + ".mp4")
});
const upload = multer({ storage });

// Handle upload
app.post("/upload", upload.single("video"), (req, res) => {
  const inputPath = req.file.path;
  const outputDir = path.join(__dirname, "public/hls");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const ffmpeg = spawn("ffmpeg", [
    "-i", inputPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-g", "50",
    "-sc_threshold", "0",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "5",
    "-hls_flags", "delete_segments",
    path.join(outputDir, "stream.m3u8")
  ]);

  ffmpeg.stderr.on("data", (data) => {
    console.log("ffmpeg:", data.toString());
  });

  ffmpeg.on("close", (code) => {
    fs.unlinkSync(inputPath); // Delete MP4 after processing
    if (code === 0) {
      res.send("Video berjaya ditukar ke siaran!");
    } else {
      res.status(500).send("Gagal convert video.");
    }
  });
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
