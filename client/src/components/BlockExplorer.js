import React, { useState, useEffect } from 'react';

const BlockExplorer = ({ txHash, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Simulate fetching blockchain data
    useEffect(() => {
        const timer = setTimeout(() => {
            setData({
                transactionHash: txHash || '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                status: 'Success',
                block: Math.floor(Math.random() * 10000000) + 15000000,
                timestamp: new Date().toUTCString(),
                from: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                to: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // Contract Address
                value: '0 Ether',
                gasPrice: '15.423 Gwei'
            });
            setLoading(false);
        }, 1500); // Fake Delay
        return () => clearTimeout(timer);
    }, [txHash]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading Transaction Details...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#f8f9fa] z-50 overflow-y-auto font-sans text-gray-700">
            {/* Fake Header */}
            <div className="bg-white border-b border-gray-200 py-3 px-4 md:px-20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-900 text-white p-1 rounded-full font-bold w-8 h-8 flex items-center justify-center text-sm">E</div>
                    <span className="font-bold text-lg text-gray-800 tracking-tight">Etherscan</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">Testnet</span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                    <span>Home</span>
                    <span>Blockchain</span>
                    <span>Tokens</span>
                    <span>Resources</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-sm font-medium transition"
                    >
                        ← Back to Vault
                    </button>
                    <h2 className="text-xl font-medium text-gray-900">Transaction Details</h2>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button className="px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">Overview</button>
                        <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Logs</button>
                        <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">State</button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Row 1: Hash */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Transaction Hash:
                            </div>
                            <div className="md:col-span-3 font-mono text-gray-900 break-all">{data.transactionHash}</div>
                        </div>

                        {/* Row 2: Status */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Status:
                            </div>
                            <div className="md:col-span-3">
                                <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-xs font-bold flex items-center w-max">
                                    <i className="fas fa-check-circle mr-1"></i> Success
                                </span>
                            </div>
                        </div>

                        {/* Row 3: Block */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Block:
                            </div>
                            <div className="md:col-span-3 flex items-center gap-2">
                                <span className="text-blue-600 hover:underline cursor-pointer">{data.block}</span>
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">12 Block Confirmations</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <hr className="border-gray-100" />

                        {/* Row 4: Timestamp */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Timestamp:
                            </div>
                            <div className="md:col-span-3 text-gray-900 flex items-center gap-2">
                                <i className="far fa-clock text-gray-400"></i>
                                {data.timestamp}
                            </div>
                        </div>

                        {/* Divider */}
                        <hr className="border-gray-100" />

                        {/* Row 5: Interaction */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Interacted With (To):
                            </div>
                            <div className="md:col-span-3">
                                <span className="text-blue-600 hover:underline cursor-pointer truncate block md:inline font-mono">
                                    Contract {data.to}
                                </span>
                                <span className="ml-2 text-xs text-gray-400"><i className="fas fa-check-circle text-green-500"></i> Verified</span>
                            </div>
                        </div>

                        {/* Row 6: Value */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Value:
                            </div>
                            <div className="md:col-span-3 bg-gray-50 px-2 py-1 rounded inline-block w-max font-medium text-gray-900">
                                <i className="fab fa-ethereum text-gray-400 mr-1"></i> {data.value}
                            </div>
                        </div>

                        {/* Row 7: Gas */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-gray-500 flex items-center gap-1">
                                <i className="far fa-question-circle"></i> Gas Price:
                            </div>
                            <div className="md:col-span-3 text-gray-600">
                                {data.gasPrice}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 text-xs">
                    Powered by Ethereum. This data mimics the Sepolia Testnet Explorer.
                </div>
            </div>
        </div>
    );
};

export default BlockExplorer;
