import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import './App.css';
import LoginPage from './components/LoginPage';
import { QRCodeSVG } from 'qrcode.react';
import BlockExplorer from './components/BlockExplorer';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
// Contract Address (from your local deployment)
const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const CONTRACT_ABI = [
  "function registerIP(string memory _contentHash, string memory _title, string memory _description) public",
  "function getUserIPs(address _user) public view returns (bytes32[] memory)",
  "function getIPDetails(bytes32 _assetId) public view returns (address owner, string memory contentHash, uint256 timestamp, string memory title, string memory description)",
  "function getDetailsByHash(string memory _hash) public view returns (address owner, uint256 timestamp, string memory title, string memory description)",
  "event IPRegistered(bytes32 indexed assetId, address indexed owner, string contentHash, uint256 timestamp)"
];

const App = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null); // Web2 User
  const [dbFiles, setDbFiles] = useState([]);

  // --- EXISTING STATE ---
  const [account, setAccount] = useState(null); // Web3 Account
  const [active, setActive] = useState(false);
  const [contract, setContract] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedHash, setUploadedHash] = useState('');
  const [message, setMessage] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  // const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Unused for now

  // Navigation & Verification State
  const [currentView, setCurrentView] = useState('dashboard');
  const [verificationHash, setVerificationHash] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  // Explorer View
  const [explorerTx, setExplorerTx] = useState(null);

  const fileInputRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Check Local Storage for Login
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      fetchDbFiles(token);
    }

    // Check Wallet
    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setActive(true);
          setupContract(accounts[0]);
        } else {
          disconnectWallet();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Files from DB (Authenticated)
  const fetchDbFiles = async (tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/my-files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Standardize format
        const formatted = data.map(f => ({
          id: f.id,
          name: f.file_name, // DB column
          description: f.description || "Stored in Vault",
          hash: f.content_hash,
          uploaded: f.uploaded_at,
          status: 'verified' // Assumed
        }));
        setDbFiles(formatted);
      }
    } catch (e) {
      console.error("Failed to fetch DB files", e);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    fetchDbFiles();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setDbFiles([]);
  };

  // --- CONTRACT FUNCTIONS ---
  const verifyIPHash = async () => {
    if (!verificationHash) return;
    setVerificationError('');
    setVerificationResult(null);

    let readContract = contract;
    if (!readContract) {
      try {
        const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
        readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      } catch (e) {
        console.error("No provider available");
        setVerificationError("Please connect wallet or ensure local node is running.");
        return;
      }
    }

    try {
      const result = await readContract.getDetailsByHash(verificationHash);
      setVerificationResult({
        owner: result.owner,
        timestamp: new Date(result.timestamp.toNumber() * 1000).toLocaleString(),
        title: result.title,
        description: result.description,
        hash: verificationHash
      });
    } catch (err) {
      console.error(err);
      setVerificationError("Hash not found or invalid.");
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setActive(true);
          setupContract(accounts[0]);
        }
      } catch (err) {
        console.error("Check wallet error:", err);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setActive(true);
      setupContract(accounts[0]);
    } catch (err) {
      console.error("Connect wallet error:", err);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setActive(false);
    setContract(null);
  };

  const setupContract = async (userAccount, signer = null) => {
    try {
      let contractSigner = signer;
      if (!contractSigner) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        contractSigner = provider.getSigner();
      }
      const ipContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, contractSigner);
      setContract(ipContract);
    } catch (err) {
      console.error("Setup contract error:", err);
    }
  };

  const connectDevWallet = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      const devPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account 0
      const signer = new ethers.Wallet(devPrivateKey, provider);
      await provider.ready;
      const address = await signer.getAddress();
      setAccount(address);
      setActive(true);
      setupContract(address, signer);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Localhost 8545. Make sure the blockchain is running!");
    }
  };

  // --- UPLOAD ---
  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files); // Store multiple
      setSelectedFile(files[0]); // Keep single for preview if needed
      setShowUploadModal(true);
      setMessage('');
      setUploadedHash('');
    }
  };

  const uploadToIpfsStub = async (file) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const fakeHash = "Qm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        resolve(fakeHash);
      }, 1500);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (!contract && !active) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setMessage('');

    try {
      // 1. Upload to IPFS (All files) - For demo we just hash the first one or loop
      // In a real app we would loop. Here we just take the first one for the main Hash
      const fileToRegister = selectedFiles[0];
      setUploadProgress(40);
      const ipfsHash = await uploadToIpfsStub(fileToRegister);
      setUploadedHash(ipfsHash);
      setUploadProgress(70);

      // 2. Register on Blockchain
      if (contract) {
        const tx = await contract.registerIP(ipfsHash, fileToRegister.name, "Securely stored in IP Vault");

        // Show in Explorer
        setExplorerTx({
          hash: tx.hash,
          status: 'Pending',
          block: '...',
          from: account,
          to: CONTRACT_ADDRESS,
          timestamp: 'Just now'
        });

        await tx.wait();

        // Update Explorer
        setExplorerTx({
          hash: tx.hash,
          status: 'Success',
          block: 10245, // Demo
          from: account,
          to: CONTRACT_ADDRESS,
          timestamp: new Date().toLocaleString()
        });
      }

      setUploadProgress(100);
      setMessage(`Success! File registered. Hash: ${ipfsHash}`);

      // Add to local list for demo
      const newFile = {
        id: Date.now(),
        name: fileToRegister.name,
        description: "Securely stored in IP Vault",
        hash: ipfsHash,
        uploaded: new Date().toISOString(),
        status: 'verified'
      };
      // Optimistic UI update
      setDbFiles([...dbFiles, newFile]);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setShowUploadModal(false);
        setSelectedFiles([]);
        setSelectedFile(null);
      }, 2000);

    } catch (err) {
      console.error(err);
      setMessage("Error uploading file. Check console.");
      setIsUploading(false);
    }
  };

  const updateFileStatus = (status) => {
    setSelectedFiles(prev => prev.map(f => ({ ...f, status })));
  };

  // --- RENDER ---
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">

      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Navbar */}
        <nav className="flex justify-between items-center mb-10 bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50 shadow-xl sticky top-4 z-50">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <i className="fas fa-cube text-white text-xl"></i>
            </div>
            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">IP Vault</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            <button onClick={() => setCurrentView('dashboard')} className={`px-4 py-2 rounded-lg transition-all duration-200 ${currentView === 'dashboard' ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
              <i className="fas fa-th-large mr-2"></i> Dashboard
            </button>
            <button onClick={() => setCurrentView('verify')} className={`px-4 py-2 rounded-lg transition-all duration-200 ${currentView === 'verify' ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
              <i className="fas fa-search mr-2"></i> Verify IP
            </button>
            <a href="#" className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
              <i className="fas fa-book mr-2"></i> Docs
            </a>
          </div>

          {/* User Profile / Connect */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-300">Sepolia Testnet</span>
            </div>

            {!active ? (
              <div className="flex items-center">
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg transform hover:scale-105 transition duration-200 flex items-center"
                >
                  <i className="fas fa-wallet mr-2"></i> Connect
                </button>
                <button
                  onClick={connectDevWallet}
                  className="ml-2 text-gray-400 hover:text-white text-xs underline"
                >
                  Dev Mode
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-gray-300 text-sm font-mono">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                <button onClick={disconnectWallet} className="text-gray-400 hover:text-white ml-2" title="Disconnect Wallet">
                  <i className="fas fa-unlink"></i>
                </button>
              </div>
            )}

            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors ml-2">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </nav>

        {/* --- MAIN CONTENT --- */}

        {currentView === 'dashboard' && (
          <div className="animate-fade-in-up">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8">
              <div>
                <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-1">Welcome back</h2>
                <h1 className="text-2xl font-mono text-white mb-2 break-all">{user.username} {user.email ? `(${user.email})` : ''}</h1>
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
                  <span className="flex items-center"><i className="fas fa-shield-alt mr-2 text-blue-400"></i> Database Verified</span>
                  {isConnected ?
                    <span className="flex items-center text-green-400"><i className="fas fa-link mr-2"></i> Wallet Connected</span> :
                    <span className="flex items-center text-yellow-400"><i className="fas fa-unlink mr-2"></i> Wallet Not Connected</span>
                  }
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-white/10 md:bg-white rounded-xl shadow-lg backdrop-blur-sm md:backdrop-blur-none mt-6 md:mt-0 transform transition-transform duration-300">
                <div className="border-2 border-dashed border-gray-300 md:border-gray-900 p-1 rounded-lg bg-white">
                  <QRCodeSVG
                    value={`IPVAULT:USER:${user.id}:${user.username}`}
                    size={88} // Fixed size is fine, maybe slightly smaller on tiny screens but 88 is small enough
                    fgColor="#111827"
                    bgColor="#FFFFFF"
                    level="H"
                  />
                </div>
                <p className="text-[10px] text-gray-300 md:text-gray-900 font-black mt-1 tracking-widest uppercase">Vault ID</p>
              </div>
            </div>
          </div>

            {/* Stats / Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-2xl border border-gray-700 hover:border-purple-500 transition duration-300 group">
            <div className="w-14 h-14 bg-purple-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
              <i className="fas fa-fingerprint text-purple-400 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Identity Secured</h3>
            <p className="text-gray-400">Your account is secured with encryption.</p>
          </div>

          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-2xl border border-gray-700 hover:border-blue-500 transition duration-300 group">
            <div className="w-14 h-14 bg-blue-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
              <i className="fas fa-shield-alt text-blue-400 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Private Vault</h3>
            <p className="text-gray-400">Only you can access your uploaded files.</p>
          </div>

          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-2xl border border-gray-700 hover:border-green-500 transition duration-300 group">
            <div className="w-14 h-14 bg-green-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
              <i className="fas fa-globe text-green-400 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Blockchain Sync</h3>
            <p className="text-gray-400">Link your wallet to timestamp records on-chain.</p>
          </div>
        </div>

        {/* Dashboard / Recent Activity */}
        <div className="bg-gray-800 bg-opacity-40 rounded-3xl p-8 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white flex items-center">
              <i className="fas fa-history text-purple-500 mr-4"></i> Your Personal Vault
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition font-bold"
              >
                <i className="fas fa-plus mr-2"></i> New Upload
              </button>
              <button
                onClick={() => fetchDbFiles()}
                className="text-sm text-purple-400 hover:text-white flex items-center bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {dbFiles.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700">
                <i className="fas fa-folder-open text-6xl text-gray-600 mb-4"></i>
                <p className="text-xl text-gray-400">Your vault is empty</p>
                <p className="text-sm text-gray-500 mt-2">Upload files to save them to your account.</p>
              </div>
            ) : (
              dbFiles.map((file) => (
                <div key={file.id} className="group relative bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-file-contract text-white text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition">{file.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{file.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs font-mono text-gray-500">
                          <span className="flex items-center"><i className="far fa-clock mr-1"></i> {new Date(file.uploaded).toLocaleString()}</span>
                          <span className="hidden md:inline text-gray-600">|</span>
                          <span className="flex items-center truncate max-w-[150px]"><i className="fas fa-hashtag mr-1"></i> {file.hash}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded-full border border-green-900">
                        SAVED
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(file.hash)}
                        className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                        title="Copy Hash"
                      >
                        <i className="far fa-copy"></i>
                      </button>
                      <button
                        onClick={() => {
                          setExplorerTx("0x" + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2));
                          setCurrentView('explorer');
                        }}
                        className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                        title="View on Etherscan"
                      >
                        <i className="fas fa-external-link-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
        )}

      {/* VIEW: VERIFY IP */}
      {currentView === 'verify' && (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-white mb-4">IP Verification <span className="text-purple-500">Decoder</span></h1>
            <p className="text-gray-400 text-lg">Enter a file hash to verify its authenticity, ownership, and timestamp on the blockchain.</p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={verificationHash}
                onChange={(e) => setVerificationHash(e.target.value)}
                placeholder="Enter Hash (e.g., 0x8a7...)"
                className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                onClick={verifyIPHash}
                disabled={!verificationHash}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition"
              >
                Verify Hash
              </button>
            </div>
            {verificationError && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400 flex items-center">
                <i className="fas fa-exclamation-circle mr-3"></i> {verificationError}
              </div>
            )}
          </div>

          {verificationResult && (
            <div className="relative group">
              {/* Print/Download Button */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white text-gray-900 hover:bg-gray-100 px-3 py-1 rounded-lg text-xs font-bold shadow-lg transition flex items-center print:hidden"
                >
                  <i className="fas fa-print mr-2"></i> Print Certificate
                </button>
              </div>

              <div className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] max-w-2xl mx-auto border-4 border-double border-gray-300 relative p-4 md:p-8">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                  <i className="fas fa-cube text-9xl"></i>
                </div>

                {/* Header */}
                <div className="text-center border-b-2 border-gray-900 pb-6 mb-6">
                  <h2 className="text-3xl font-serif font-black tracking-widest uppercase mb-1">Certificate of Authenticity</h2>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Blockchain Intellectual Property Registry</p>
                </div>

                {/* Content */}
                <div className="space-y-6 relative z-10">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 italic mb-2">This is to certify that the digital asset:</p>
                    <h3 className="text-2xl font-bold font-serif">{verificationResult.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{verificationResult.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                    <div>
                      <span className="block text-xs font-bold text-gray-400 uppercase">Timestamp</span>
                      <span className="font-mono">{verificationResult.timestamp}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-gray-400 uppercase">Owner Wallet</span>
                      <span className="font-mono text-xs">{verificationResult.owner.slice(0, 10)}...{verificationResult.owner.slice(-8)}</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase mb-1 text-center">Cryptographic Hash (SHA-256)</span>
                    <div className="bg-gray-900 text-white p-3 rounded font-mono text-xs break-all text-center">
                      {verificationResult.hash}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-300 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center rounded-full mr-3">
                      <i className="fas fa-shield-alt text-xl"></i>
                    </div>
                    <div>
                      <p className="font-bold text-xs uppercase">Verified & Secured</p>
                      <p className="text-[10px] text-gray-500">Immutable Proof</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VerifiedByIPVault" alt="QR" className="w-16 h-16 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="text-center mt-6 print:hidden">
                <p className="text-gray-500 text-sm mb-2"><i className="fas fa-info-circle mr-2"></i> How to verify externally?</p>
                <p className="text-xs text-gray-600 max-w-md mx-auto">
                  Since this is running on a <strong>Local Private Blockchain</strong>, public block explorers (like Etherscan) cannot see it.
                  To make this publicly verifiable, we would verify this app on the <strong>Sepolia Testnet</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: EXPLORER */}
      {currentView === 'explorer' && (
        <div className="fixed inset-0 z-[100]">
          <BlockExplorer txHash={explorerTx} onBack={() => setCurrentView('dashboard')} />
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl transform transition-all scale-100">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <i className="fas fa-cloud-upload-alt text-purple-500 mr-3"></i> Upload & Register
            </h2>

            <div className="space-y-3 mb-6">
              {selectedFiles.map((fileObj, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-white text-sm font-semibold truncate">{fileObj.name}</p>
                    <p className="text-gray-400 text-xs mt-1">{(fileObj.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="flex-shrink-0">
                    {fileObj.status === 'pending' && <span className="text-yellow-500 text-xs font-bold px-2 py-1 bg-yellow-900/20 rounded">READY</span>}
                    {fileObj.status === 'uploading' && <span className="text-blue-400 text-xs font-bold px-2 py-1 bg-blue-900/20 rounded animate-pulse">PROCESSING</span>}
                    {fileObj.status === 'success' && <span className="text-green-400 text-xs font-bold px-2 py-1 bg-green-900/20 rounded">REGISTERED</span>}
                    {fileObj.status === 'error' && <span className="text-red-400 text-xs font-bold px-2 py-1 bg-red-900/20 rounded">FAILED</span>}
                  </div>
                </div>
              ))}
            </div>

            {isUploading && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="text-center text-purple-300 text-sm mt-3 animate-pulse">
                  {message || "Processing..."}
                </p>
              </div>
            )}

            {uploadedHash && !isUploading && (
              <div className="mb-6 bg-green-900/20 border border-green-800 p-4 rounded-xl">
                <p className="text-xs text-green-400 font-bold mb-1">Generated Hash:</p>
                <code className="text-xs text-green-300 break-all bg-black/20 p-2 rounded block">{uploadedHash}</code>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setIsUploading(false);
                  setUploadedHash('');
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-3 rounded-xl font-bold transition duration-200"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0 || selectedFiles[0].status === 'success'}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold shadow-lg transition duration-200"
              >
                {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Processing</> : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 pt-10 pb-10 bg-gray-900 text-center text-gray-500 text-sm">
        <p>Built for the Future of IP • IP Vault © 2023</p>
      </footer>
    </div>
    </div >
  );
}

export default App;
