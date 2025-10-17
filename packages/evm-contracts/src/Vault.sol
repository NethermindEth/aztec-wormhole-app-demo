// contracts/Vault.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.20;

import {BytesLib} from "wormhole/ethereum/contracts/libraries/external/BytesLib.sol";
import {IWormhole} from "wormhole/ethereum/contracts/interfaces/IWormhole.sol";
import {VaultGetters} from "./VaultGetters.sol";

/**
 * @title Vault
 * @dev Main vault contract for verifying and processing VAAs from Aztec
 * This contract runs on Arbitrum Sepolia and receives cross-chain messages from Aztec
 */
contract Vault is VaultGetters {
    using BytesLib for bytes;

    /**
     * @dev Event emitted when an emitter is registered
     * @param chainId The chain ID of the emitter
     * @param emitterAddress The emitter address as bytes32
     */
    event EmitterRegistered(uint16 indexed chainId, bytes32 emitterAddress);

    /**
     * @dev Event emitted when a VAA message is processed and stored
     * @param donationReceiver The address that will receive the donation tokens
     * @param txId The transaction ID of the processed message
     * @param messageLength The length of the processed VAA payload
     */
    event MessageStored(address indexed donationReceiver, bytes32 indexed txId, uint256 messageLength);

    /**
     * @dev Event emitted when an amount is processed and extracted from a VAA
     * @param donationReceiver The address that will receive the donation tokens  
     * @param amount The donation amount extracted from the payload
     */
    event AmountExtracted(address indexed donationReceiver, uint256 amount);

    // No debugging events needed

    /**
     * @dev Constructor initializes parent VaultGetters
     * @param wormholeAddr Address of the Wormhole contract
     * @param chainId_ Wormhole Chain ID for this vault (10003 = Arbitrum Sepolia)
     * @param evmChainId_ Native EVM Chain ID (421614 = Arbitrum Sepolia)
     * @param finality_ Number of confirmations required for finality
     * @param donationContractAddr Address of the donation contract
     */
    constructor(
        address payable wormholeAddr,
        uint16 chainId_,
        uint256 evmChainId_,
        uint8 finality_,
        address donationContractAddr
    ) VaultGetters(wormholeAddr, chainId_, evmChainId_, finality_, donationContractAddr) {}

    /**
     * @notice Verifies a VAA (Verified Action Approval) and stores extracted data
     * @dev Validates that a VAA is properly signed and automatically stores the message
     * @param encodedVm A byte array containing a VAA signed by the guardians
     */
    function verify(bytes memory encodedVm) external {
        // Get the payload by verifying the VAA
        bytes memory payload = _verify(encodedVm);
        
        // Extract and store data from the payload
        _processPayload(payload);
    }

    /**
     * @dev Internal verification function for VAAs
     * @param encodedVm A byte array containing a VAA signed by the guardians
     * @return bytes The payload of the VAA if verification succeeds
     */
    function _verify(bytes memory encodedVm) internal view returns (bytes memory) {
        // Parse and verify the VAA through Wormhole
        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole().parseAndVerifyVM(encodedVm);
    
        // Ensure the VAA signature is valid
        require(valid, reason);
        
        // Ensure the VAA is from a valid emitter
        require(verifyAuthorizedEmitter(vm), "Invalid emitter: source not recognized");

        return vm.payload;
    }

    function _processPayload(bytes memory payload) internal {
        // Verify we're not running on a fork
        require(!isFork(), "Invalid fork: expected chainID mismatch");

        // uint256 txIdOffset = 32;

        // Ensure payload is long enough (needs txId + amount data)
        // Minimum: 32 bytes (txId) + 95 bytes (to reach amount at offset 126) = 127 bytes
        require(payload.length >= 127, "Payload too short");

        // Extract txId from the first 32 bytes
        bytes32 txId;
        assembly {
            txId := mload(add(payload, 32)) // First 32 bytes are the txId
        }

        // Ensure the extracted txId is valid
        require(txId != bytes32(0), "Invalid txId extracted");

        // Extract amount from payload
        uint256 amount;

        /* 
         * NOTE: Dynamic recipient address extraction (commented out for simplicity)
         * 
         * To make this application more versatile, the VAA payload can include a recipient
         * address that specifies where donation tokens should be sent. The following code
         * demonstrates how to extract a 20-byte address from the payload:
         * 
         * address donationReceiver;
         * assembly {
         *     // Load the 32 bytes after txId (which includes our 20 byte address)
         *     let addressData := mload(add(payload, 64)) // 32 (data offset) + 32 (txId offset) = 64
         *     // Shift right by 12 bytes (32 - 20) to align the address
         *     donationReceiver := shr(96, addressData)
         * }
         * require(donationReceiver != address(0), "Invalid address");
         * 
         * For this proof-of-concept, we use a donation contract with a fixed
         * recipient address to keep the implementation simple and focused.
         */
        address donationReceiver = donationContract().receiver(); // Get the actual donation recipient
    
        assembly {
            // Load the 32 bytes from the amount section
            let amountData := mload(add(payload, 126))
            // Extract only the first byte (shift right by 31 bytes = 248 bits)
            amount := shr(248, amountData)
        }

        // Check if already processed
        require(_state.arbitrumMessages[txId] == 0, "Already processed");

        // Store the amount for this txId
        _state.arbitrumMessages[txId] = amount;

        // Emit event for successful message storage
        emit MessageStored(donationReceiver, txId, payload.length);

        if (amount > 0) {
            donationContract().donate(amount);
        }

        // Emit event for successful amount extraction
        emit AmountExtracted(donationReceiver, amount);
    }

    /**
     * @dev Verifies that a VAA is from a registered authorized emitter
     * @param vm The parsed Wormhole VM structure
     * @return bool True if the emitter is authorized
     */
    function verifyAuthorizedEmitter(IWormhole.VM memory vm) internal view returns (bool) {
        // Check if the emitter is registered for this chain
        bytes32 registeredEmitter = getRegisteredEmitter(vm.emitterChainId);
        
        // Return true if the emitter matches the registered one
        return registeredEmitter == vm.emitterAddress;
    }

    /**
     * @notice Registers an emitter from another chain for verification
     * @dev Only the owner can register emitters
     * @param chainId_ The Wormhole chain ID of the emitter (e.g., 52 for Aztec)
     * @param emitterAddress_ The emitter contract address as bytes32
     */
    function registerEmitter(uint16 chainId_, bytes32 emitterAddress_) external onlyOwner {
        require(emitterAddress_ != bytes32(0), "Emitter address cannot be zero");
        
        _state.registeredEmitters[chainId_] = emitterAddress_;
        
        emit EmitterRegistered(chainId_, emitterAddress_);
    }

    /**
     * @dev Gets the stored amount for a given transaction ID
     * @param txId The transaction ID from the VAA payload
     * @return uint256 The stored donation amount
     */
    function getArbitrumMessage(bytes32 txId) public view returns (uint256) {
        return _state.arbitrumMessages[txId];
    }
}