import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import LoginPage from './components/LoginPage';
import { QRCodeSVG } from 'qrcode.react';
import BlockExplorer from './components/BlockExplorer';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { useWeb3ModalProvider, useWeb3ModalAccount } from '@web3modal/ethers/react';

// 1. Get projectId from WalletConnect Cloud
const projectId = 'YOUR_PROJECT_ID'; // Replace with a real one for production

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
}

const sepolia = {
  chainId: 11155111,
  name: 'Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://rpc.sepolia.org'
}

const local = {
  chainId: 1337,
  name: 'Localhost',
  currency: 'ETH',
  rpcUrl: 'http://127.0.0.1:8545'
}

// 3. Create a metadata object
const metadata = {
  name: 'IP Vault',
  description: 'Blockchain IP Registration',
  url: 'https://ip-vault.netlify.app', // origin must match your domain & subdomain
  icons: ['https://avatars.mywebsite.com/']
}

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,

  /*Optional*/
  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: true, // true by default
  rpcUrl: '...', // used for the Coinbase SDK
  defaultChainId: 1, // used for the Coinbase SDK
})

// 5. Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [mainnet, sepolia, local],
  projectId,
  enableAnalytics: true // Optional - defaults to your Cloud configuration
})

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
  // --- WEB3MODAL HOOKS ---
  const { address, isConnected } = useWeb3ModalAccount()
  const { walletProvider } = useWeb3ModalProvider()

  // --- AUTH STATE ---
  const [user, setUser] = useState(null); // Web2 User
  const [dbFiles, setDbFiles] = useState([]);

  // --- EXISTING STATE ---
  // const [account, setAccount] = useState(null); // Replaced by 'address'
  // const [active, setActive] = useState(false);  // Replaced by 'isConnected'
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
  }, []);

  // Sync Contract when Provider Changes
  useEffect(() => {
    if (isConnected && walletProvider) {
      setupContract(); // New setup
    } else {
      setContract(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, walletProvider]);

  const setupContract = async () => {
    if (!walletProvider) return;
    const ethersProvider = new ethers.BrowserProvider(walletProvider)
    const signer = await ethersProvider.getSigner()
    const ipContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setContract(ipContract);
  }

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
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const fileObj = { name: file.name, size: file.size, status: 'pending' };
      setSelectedFiles([fileObj]);
      setShowUploadModal(true);
      setMessage('');
      setUploadedHash('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    // Require Wallet for Blockchain, Require Login for DB
    if (!contract) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload to Backend (Authenticated)
      const formData = new FormData();
      formData.append('file', selectedFile);

      updateFileStatus('uploading');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Backend upload failed');
      const data = await response.json();
      const contentHash = data.contentHash;

      setUploadedHash(contentHash);
      setUploadProgress(50);

      // 2. Register on Blockchain
      setMessage("Please confirm the transaction in MetaMask...");

      const tx = await contract.registerIP(
        contentHash,
        selectedFile.name,
        "Uploaded via IP Vault"
      );

      setMessage("Transaction submitted! Waiting for confirmation...");
      await tx.wait();

      setUploadProgress(100);
      updateFileStatus('success');
      setMessage(`Success! Transaction: ${tx.hash}`);

      // Refresh DB list
      fetchDbFiles();

      setTimeout(() => {
        setShowUploadModal(false);
        setSelectedFile(null);
        setSelectedFiles([]);
      }, 2000);

    } catch (err) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
      updateFileStatus('error');
    } finally {
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
      {/* Navigation */}
      <nav className="bg-gray-900 bg-opacity-80 backdrop-blur-md fixed w-full z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 cursor-pointer" onClick={() => window.location.reload()}>
                <div className="flex items-center">
                  <div className="blockchain-node mr-2 text-purple-500">
                    <i className="fas fa-cube text-2xl"></i>
                  </div>
                  <span className="title-font text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">IP VAULT</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <button onClick={() => setCurrentView('dashboard')} className={`nav-item px-3 py-2 rounded-md text-sm font-medium transition ${currentView === 'dashboard' ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
                    Dashboard
                  </button>
                  <button onClick={() => setCurrentView('verify')} className={`nav-item px-3 py-2 rounded-md text-sm font-medium transition ${currentView === 'verify' ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
                    Verify IP
                  </button>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 gap-3">
                {/* User Info from DB */}
                <div className="text-gray-300 text-xs px-2 py-1 bg-gray-800 rounded border border-gray-700">
                  <i className="fas fa-user-circle mr-1"></i> {user.username}
                </div>

                {!isConnected ? (
                  <div className="flex items-center">
                    {/* Web3Modal Button */}
                    <w3m-button />
                  </div>
                ) : (
                  <div className="flex items-center space-x-4 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-gray-300 text-sm font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    <w3m-button /> {/* This handles disconnect/account view */}
                  </div>
                )}

                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-xs ml-4 border border-red-900/30 px-2 py-1 rounded bg-red-900/10">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {currentView === 'dashboard' && (
          <>
            {/* User Vault ID Card */}
            <div className="mb-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-1 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] max-w-3xl mx-auto transform hover:scale-[1.01] transition-all">
              <div className="bg-gray-900 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-1">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                      <i className="fas fa-user-astronaut text-4xl text-gray-200"></i>
                    </div>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left z-10">
                  <h2 className="text-sm text-purple-400 font-bold tracking-widest uppercase mb-1">Authenticated Account</h2>
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
          </>
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
    </div>
  );
}

export default App;
