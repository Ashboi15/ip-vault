const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const port = 5000;

// Basic setup
app.use(express.json());

// Simple file storage
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(file.originalname + timestamp).digest('hex').substring(0, 8);
    cb(null, `${timestamp}-${hash}${require('path').extname(file.originalname)}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Simple data storage (in memory)
let files = [];

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'IP Vault Backend Running! 🚀',
    files: files.length,
    timestamp: new Date().toISOString()
  });
});

// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Generate hash
  const fileBuffer = fs.readFileSync(req.file.path);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Store file info
  const fileInfo = {
    id: Date.now(),
    name: req.file.originalname,
    size: req.file.size,
    hash: hash,
    uploaded: new Date().toISOString()
  };

  files.push(fileInfo);

  res.json({
    success: true,
    message: 'File uploaded successfully! 🎉',
    file: fileInfo
  });
});

// Get all files
app.get('/files', (req, res) => {
  res.json(files);
});

// Get file by hash
app.get('/file/:hash', (req, res) => {
  const file = files.find(f => f.hash === req.params.hash);
  if (file) {
    res.json(file);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Minimal Backend running on port ${port}`);
  console.log(`📁 Uploads: ./uploads/`);
  console.log(`💾 Files stored: ${files.length}`);
  console.log(`✅ Ready!`);
});
