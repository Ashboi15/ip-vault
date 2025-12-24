import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first!');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        setSelectedFile(null);
        // Refresh file list
        fetchFiles();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:5000/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  // Fetch files on component mount
  React.useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-purple-400">
            🔒 IP Vault
          </h1>
          <p className="text-gray-300">
            Secure your intellectual property with cryptographic hashing
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Upload Your File
          </h2>
          
          <div className="space-y-4">
            <input
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload & Hash File'}
            </button>
          </div>

          {message && (
            <div className="mt-4 p-3 rounded-lg bg-gray-700 text-center">
              {message}
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Your Files ({files.length})
          </h2>
          
          {files.length === 0 ? (
            <p className="text-gray-400 text-center">No files uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">{file.name}</h3>
                      <p className="text-sm text-gray-400">
                        Size: {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-sm text-gray-400">
                        Uploaded: {new Date(file.uploaded).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-purple-400 font-mono break-all">
                        Hash: {file.hash.substring(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={fetchFiles}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Refresh Files
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

