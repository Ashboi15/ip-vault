const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Generate file hash
const generateHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Simple in-memory storage (you can save to JSON file later)
let ipAssets = [];

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: 'Local File Storage',
    timestamp: new Date().toISOString(),
    totalAssets: ipAssets.length
  });
});

// File upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const contentHash = await generateHash(filePath);
    
    // Create IP asset record
    const ipAsset = {
      id: Date.now().toString(),
      contentHash,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      userAddress: req.body.userAddress || 'anonymous',
      registeredAt: new Date().toISOString()
    };
    
    ipAssets.push(ipAsset);
    
    res.json({
      success: true,
      contentHash,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      id: ipAsset.id,
      message: 'File uploaded and registered successfully! 🎉'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Register IP
app.post('/api/ips', async (req, res) => {
  const { contentHash, title, description, userAddress } = req.body;
  
  if (!contentHash || !title) {
    return res.status(400).json({ error: 'Missing content hash or title' });
  }
  
  try {
    const ipAsset = {
      id: Date.now().toString(),
      contentHash,
      title,
      description: description || '',
      userAddress: userAddress || 'anonymous',
      registeredAt: new Date().toISOString()
    };
    
    ipAssets.push(ipAsset);
    
    res.json({
      success: true,
      id: ipAsset.id,
      message: 'IP registered successfully! 🎉'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register IP',
      details: error.message 
    });
  }
});

// Get user IPs
app.get('/api/ips/:address', (req, res) => {
  try {
    const userIPs = ipAssets.filter(ip => ip.userAddress === req.params.address);
    res.json(userIPs);
  } catch (error) {
    console.error('Error fetching IPs:', error);
    res.json([]);
  }
});

// Get all IPs
app.get('/api/ips', (req, res) => {
  try {
    res.json(ipAssets);
  } catch (error) {
    console.error('Error fetching IPs:', error);
    res.json([]);
  }
});

app.listen(port, () => {
  console.log(`🚀 Simple Backend running on port ${port}`);
  console.log(`📁 File uploads stored in: ${path.join(__dirname, 'uploads')}`);
  console.log(`💾 Database: Local Memory (${ipAssets.length} assets)`);
  console.log(`✅ Ready to accept file uploads!`);
});
