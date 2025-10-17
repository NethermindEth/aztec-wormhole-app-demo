// contracts/State.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.20;

/**
 * @title VaultStorage
 * @dev Defines the core storage structure for the Vault contract system
 */
contract VaultStorage {
    struct Provider {
        uint16 chainId;
        uint16 governanceChainId;
        uint8 finality;
        bytes32 governanceContract;
    }

    struct State {
        address wormholeAddr;
        
        Provider provider;

        // Registered emitter addresses for cross-chain verification
        mapping(uint16 => bytes32) registeredEmitters;
        
        // EIP-155 Chain ID
        uint256 evmChainId;
        
        // Store Aztec TxID -> amount mapping
        mapping(bytes32 => uint256) arbitrumMessages;

        address donationContractAddr;
    }
}

/**
 * @title VaultState
 * @dev Manages the core state for the Vault system and handles ownership
 */
contract VaultState {
    VaultStorage.State internal _state;
    address private immutable _OWNER;

    /**
     * @dev Constructor to initialize the vault state
     * @param wormholeAddr_ Address of the Wormhole contract on this chain (Arbitrum Sepolia)
     * @param chainId_ Wormhole Chain ID for this vault (10003 = Arbitrum Sepolia)
     * @param evmChainId_ Native EVM Chain ID (421614 = Arbitrum Sepolia)
     * @param finality_ Number of confirmations required for finality
     * @param donationContractAddr_ Address of the donation contract
     */
    constructor(
        address wormholeAddr_,
        uint16 chainId_,
        uint256 evmChainId_,
        uint8 finality_,
        address donationContractAddr_
    ) {
        require(wormholeAddr_ != address(0), "Wormhole address cannot be zero");
        require(donationContractAddr_ != address(0), "Donation contract address cannot be zero");
        require(finality_ > 0, "Finality must be greater than zero");

        _state.wormholeAddr = wormholeAddr_;
        _state.provider.chainId = chainId_;
        _state.evmChainId = evmChainId_;
        _state.provider.finality = finality_;

        _state.provider.governanceChainId = 0;
        _state.provider.governanceContract = bytes32(0);

        _state.donationContractAddr = donationContractAddr_;

        _OWNER = msg.sender;
    }

    /**
     * @dev Returns the owner of the contract
     * @return Address of the owner
     */
    function owner() public view returns (address) {
        return _OWNER;
    }

    /**
     * @dev Modifier that restricts functions to the owner
     */
    modifier onlyOwner() {
        require(msg.sender == _OWNER, "Caller is not the owner");
        _;
    }
}