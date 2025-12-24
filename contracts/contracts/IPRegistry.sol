// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IPRegistry
 * @dev A smart contract for registering and managing intellectual property assets on the blockchain.
 */
contract IPRegistry {
    struct IPAsset {
        address owner;
        string contentHash;
        uint256 timestamp;
        string title;
        string description;
    }

    mapping(bytes32 => IPAsset) public ipAssets;
    mapping(address => bytes32[]) public userIPs;
    mapping(string => bytes32) public hashToId;

    event IPRegistered(
        bytes32 indexed assetId,
        address indexed owner,
        string contentHash,
        uint256 timestamp
    );

    /**
     * @dev Registers a new IP asset
     * @param _contentHash The hash of the content (e.g., IPFS hash)
     * @param _title Title of the IP asset
     * @param _description Description of the IP asset
     */
    function registerIP(
        string memory _contentHash,
        string memory _title,
        string memory _description
    ) public {
        require(bytes(_contentHash).length > 0, "Content hash cannot be empty");
        
        bytes32 assetId = keccak256(
            abi.encodePacked(
                msg.sender,
                _contentHash,
                block.timestamp
            )
        );

        IPAsset memory newIP = IPAsset({
            owner: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            title: _title,
            description: _description
        });

        ipAssets[assetId] = newIP;
        userIPs[msg.sender].push(assetId);
        
        // Map hash to ID for easy lookup (Preserve first registrant)
        if (hashToId[_contentHash] == bytes32(0)) {
            hashToId[_contentHash] = assetId;
        }

        emit IPRegistered(
            assetId,
            msg.sender,
            _contentHash,
            block.timestamp
        );
    }

    /**
     * @dev Gets all IP asset IDs for a specific user
     * @param _user The address of the user
     * @return Array of asset IDs
     */
    function getUserIPs(address _user) public view returns (bytes32[] memory) {
        return userIPs[_user];
    }

    /**
     * @dev Gets details of a specific IP asset
     * @param _assetId The ID of the asset
     * @return owner The owner's address
     * @return contentHash The content hash
     * @return timestamp The registration timestamp
     * @return title The title of the IP asset
     * @return description The description of the IP asset
     */
    function getIPDetails(bytes32 _assetId) public view returns (
        address owner,
        string memory contentHash,
        uint256 timestamp,
        string memory title,
        string memory description
    ) {
        IPAsset memory asset = ipAssets[_assetId];
        require(asset.owner != address(0), "IP asset does not exist");
        return (
            asset.owner,
            asset.contentHash,
            asset.timestamp,
            asset.title,
            asset.description
        );
    }
    
    /**
     * @dev Gets details of an IP asset by its content hash
     * @param _hash The content hash to look up
     */
    function getDetailsByHash(string memory _hash) public view returns (
        address owner,
        uint256 timestamp,
        string memory title,
        string memory description
    ) {
        bytes32 assetId = hashToId[_hash];
        require(assetId != bytes32(0), "Hash not found in registry");
        
        IPAsset memory asset = ipAssets[assetId];
        return (
            asset.owner,
            asset.timestamp,
            asset.title,
            asset.description
        );
    }
}
