const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5001;
const SECRET_KEY = "super-secret-key-change-this"; // For JWT

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// --- DATABASE SETUP (SQLite) ---
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Error opening database:', err);
  else console.log('✅ SQLite Database connected!');
});

// Initialize Tables
db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    wallet_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Files Table (Linked to User)
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    file_name TEXT,
    content_hash TEXT,
    tx_hash TEXT,
    title TEXT,
    description TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- FILE UPLOAD SETUP ---
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

// --- BLOCKCHAIN SETUP ---
let contract = null;
let wallet = null;

const setupBlockchain = async () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    // Account 0 Private Key (Hardhat Default)
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    wallet = new ethers.Wallet(privateKey, provider);

    const contractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
    const contractABI = [
      "function registerIP(string memory _contentHash, string memory _title, string memory _description) public",
      "function getUserIPs(address _user) public view returns (bytes32[] memory)",
      "function getIPDetails(bytes32 _assetId) public view returns (address owner, string memory contentHash, uint256 timestamp, string memory title, string memory description)"
    ];

    contract = new ethers.Contract(contractAddress, contractABI, wallet);
    console.log('✅ Blockchain connected!');
  } catch (error) {
    console.log('⚠️  Blockchain not connected, using mock mode');
  }
};
setupBlockchain();

// Generate File Hash
const generateHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// --- API ROUTES ---

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'User already exists' });
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'User created!', userId: this.lastID });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. LOGIN
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Create Token
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

// 3. UPLOAD (Now Protected)
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const contentHash = await generateHash(filePath); // Generate Hash

    // Auto-save the file record
    db.run(`INSERT INTO files (user_id, file_name, content_hash) VALUES (?, ?, ?)`,
      [req.user.id, req.file.originalname, contentHash],
      function (err) {
        if (err) console.error("DB Save error", err);
      }
    );

    res.json({
      success: true,
      contentHash,
      fileName: req.file.originalname,
      message: 'File hashed and saved.'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// 4. GET MY FILES (Protected)
app.get('/api/my-files', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    authentication: 'enabled',
    database: 'sqlite',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port} with SQLite Database`);
});
