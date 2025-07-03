const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Ensure face-images directory exists
const uploadDir = path.join(__dirname, 'face-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use roll_number or employee_id from the request if available
    const id = req.body.id || Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${id}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// File upload endpoint
app.post('/api/upload-face', upload.single('face'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return relative path for storage in DB
  const filePath = `face-images/${req.file.filename}`;
  res.json({ path: filePath });
});

// Serve images statically
app.use('/face-images', express.static(uploadDir));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 