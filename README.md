# IP Vault - Blockchain-Based IP Registry

A decentralized platform for creators to securely timestamp and store their intellectual property on the blockchain. This project provides proof of creation and helps protect intellectual property in open innovation environments.

## Features

- **Secure IP Registration**: Store hashes of your intellectual property on the Ethereum blockchain
- **Proof of Creation**: Timestamped records provide indisputable proof of when content was created
- **Decentralized**: Built on blockchain technology for tamper-proof records
- **User-Friendly Interface**: Simple and intuitive web interface for managing your IP assets
- **Wallet Integration**: Connect with MetaMask or other Web3 wallets

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask browser extension (for interacting with the dApp)
- Goerli or Sepolia testnet ETH (for testing)

## Project Structure

```
ip-vault/
├── client/               # Frontend React application
├── contracts/            # Smart contracts
│   ├── contracts/        # Solidity contracts
│   ├── scripts/          # Deployment scripts
│   └── test/             # Smart contract tests
├── backend/              # Backend server (Node.js/Express)
└── README.md             # Project documentation
```

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ip-vault
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Frontend
REACT_APP_INFURA_PROJECT_ID=your-infura-project-id
REACT_APP_CONTRACT_ADDRESS=your-deployed-contract-address

# Backend
PORT=5000
PRIVATE_KEY=your-wallet-private-key
ALCHEMY_RPC_URL=your-alchemy-rpc-url
CONTRACT_ADDRESS=your-deployed-contract-address
```

### 3. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Smart Contracts

```bash
cd ../contracts
npm install @nomicfoundation/hardhat-toolbox @nomiclabs/hardhat-etherscan dotenv
```

#### Frontend

```bash
cd ../client
npm install
```

### 4. Deploy Smart Contracts

1. Compile the contracts:

```bash
cd contracts
npx hardhat compile
```

2. Deploy to local network:

```bash
npx hardhat node
# In a new terminal
npx hardhat run scripts/deploy.js --network localhost
```

3. (Optional) Deploy to testnet:

```bash
npx hardhat run scripts/deploy.js --network goerli
```

### 5. Start the Backend Server

```bash
cd backend
npm start
```

The backend server will start on `http://localhost:5000`.

### 6. Start the Frontend Development Server

```bash
cd client
npm start
```

The frontend will open in your default browser at `http://localhost:3000`.

## Using IP Vault

1. **Connect Your Wallet**: Click the "Connect Wallet" button and approve the connection in MetaMask.
2. **Register New IP**: Fill in the form with your IP details and content hash (e.g., IPFS hash).
3. **View Your IPs**: See all your registered IP assets in the dashboard.
4. **Verify Ownership**: Use the blockchain explorer to verify the registration of your IP.

## Security Considerations

- Never share your private keys or seed phrases.
- Only deploy to testnets during development.
- Always verify your smart contracts on block explorers.
- Use hardware wallets for production deployments.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the repository or contact the maintainers.

## Acknowledgements

- [Ethereum](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [React](https://reactjs.org/)
- [MetaMask](https://metamask.io/)
