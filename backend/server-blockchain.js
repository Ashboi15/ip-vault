const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');
require('dotenv').config();

// Import contract artifacts
const IPRegistry = require('../client/src/contracts/IPRegistry.json');
const contractAddresses = require('../client/src/contracts/contract-address.json');

// Configure multer for file uploads
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

// Configure multer with file size limits (10MB max)
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Initialize blockchain connection
let provider, contract, wallet;

const initializeBlockchain = () => {
  try {
    // Connect to local Hardhat network
    provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    
    // Use the first account from Hardhat (has 10000 ETH)
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    wallet = new ethers.Wallet(privateKey, provider);
    
    // Initialize contract
    contract = new ethers.Contract(
      contractAddresses.IPRegistry,
      IPRegistry.abi,
      wallet
    );
    
    console.log('✅ Connected to IPRegistry contract at:', contractAddresses.IPRegistry);
    console.log('✅ Using wallet address:', wallet.address);
    
  } catch (error) {
    console.error('❌ Error initializing blockchain:', error);
    console.log('⚠️  Running in mock mode - blockchain features disabled');
  }
};

// Initialize on startup
initializeBlockchain();

// Generate content hash for a file
const generateContentHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    blockchain: contract ? 'connected' : 'mock mode'
  });
});

// File upload endpoint
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err) {
        console.error('Multer upload error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: 'File upload failed', details: err.message });
      }

      if (!req.file) {
        console.error('No file received in upload');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('File uploaded successfully:', req.file);
      
      try {
        const filePath = req.file.path;
        console.log('Generating hash for file at path:', filePath);
        
        const contentHash = await generateContentHash(filePath);
        console.log('Generated content hash:', contentHash);
        
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        console.log('File URL:', fileUrl);

        res.json({
          success: true,
          contentHash,
          fileUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      } catch (hashError) {
        console.error('Error generating hash:', hashError);
        // Clean up the uploaded file if hash generation fails
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, (unlinkErr) => {
            if (unlinkErr) console.error('Error cleaning up file:', unlinkErr);
          });
        }
        res.status(500).json({ error: 'Failed to process file', details: hashError.message });
      }
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });
});

// Real IP registration endpoint with blockchain
app.post('/api/ips', async (req, res) => {
  const { contentHash, title, description } = req.body;
  
  if (!contentHash || !title) {
    return res.status(400).json({ error: 'Content hash and title are required' });
  }
  
  try {
    if (contract && wallet) {
      console.log('🚀 Registering IP on blockchain...');
      console.log('Content Hash:', contentHash);
      console.log('Title:', title);
      console.log('Description:', description || '');
      
      // Register IP on the smart contract
      const tx = await contract.registerIP(contentHash, title, description || '');
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);
      
      res.json({ 
        success: true, 
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        message: 'IP registered successfully on blockchain!',
        contractAddress: contractAddresses.IPRegistry
      });
      
    } else {
      // Fallback to mock mode if blockchain not connected
      console.log('⚠️  Blockchain not connected, using mock mode');
      res.json({ 
        success: true, 
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
        message: 'IP registered successfully (mock mode - blockchain not connected)'
      });
    }
  } catch (error) {
    console.error('❌ Error registering IP:', error);
    res.status(500).json({ 
      error: 'Failed to register IP on blockchain', 
      details: error.message,
      suggestion: 'Make sure Hardhat network is running on port 8545'
    });
  }
});

// Get all IPs for a user (from blockchain)
app.get('/api/ips/:address', async (req, res) => {
  try {
    if (contract) {
      const ipIds = await contract.getUserIPs(req.params.address);
      const ips = await Promise.all(
        ipIds.map(async (id) => {
          const ip = await contract.getIPDetails(id);
          return {
            id,
            owner: ip.owner,
            contentHash: ip.contentHash,
            timestamp: ip.timestamp.toString(),
            title: ip.title,
            description: ip.description,
          };
        })
      );
      res.json(ips);
    } else {
      res.status(503).json({ error: 'Blockchain not connected' });
    }
  } catch (error) {
    console.error('Error fetching IPs:', error);
    res.status(500).json({ error: 'Failed to fetch IPs' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  if (contract) {
    console.log('✅ Connected to blockchain - IP registration enabled');
  } else {
    console.log('⚠️  Running in mock mode - blockchain features disabled');
  }
});


