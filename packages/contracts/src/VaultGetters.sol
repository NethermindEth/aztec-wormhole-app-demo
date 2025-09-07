// contracts/Getters.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.20;

import {IWormhole} from "wormhole/ethereum/contracts/interfaces/IWormhole.sol";
import {VaultState} from "./VaultState.sol";
import {IDonation} from "../Interfaces/IDonation.sol";

/**
 * @title VaultGetters
 * @dev Provides accessor functions for vault state values
 */
contract VaultGetters is VaultState {
    /**
     * @dev Constructor initializes parent VaultState
     * @param wormholeAddr_ Address of the Wormhole contract on this chain
     * @param chainId_ Wormhole Chain ID for this vault (10003 = Arbitrum Sepolia)
     * @param evmChainId_ Native EVM Chain ID (421614 = Arbitrum Sepolia)
     * @param finality_ Number of confirmations required for finality
     * @param donationContractAddr_ Address of the donation contract
     */
    constructor(
        address payable wormholeAddr_,
        uint16 chainId_,
        uint256 evmChainId_,
        uint8 finality_,
        address donationContractAddr_
    ) VaultState(wormholeAddr_, chainId_, evmChainId_, finality_, donationContractAddr_) {}


    /**
     * @dev Returns the Wormhole contract instance
     * @return IWormhole interface to the Wormhole contract
     */
    function wormhole() public view returns (IWormhole) {
        return IWormhole(_state.wormholeAddr);
    }

    /**
     * @dev Returns the Wormhole chain ID for this vault
     * @return uint16 Wormhole Chain ID (10003 for Arbitrum Sepolia)
     */
    function chainId() public view returns (uint16) {
        return _state.provider.chainId;
    }

    /**
     * @dev Returns the native EVM chain ID
     * @return uint256 Native EVM Chain ID (421614 for Arbitrum Sepolia)
     */
    function evmChainId() public view returns (uint256) {
        return _state.evmChainId;
    }

    /**
     * @dev Checks if the contract is running on a different EVM chain than intended
     * 
     * This security function prevents the contract from operating if it has been:
     * - Deployed to the wrong network
     * - Copied/forked to an unintended blockchain
     * - Moved between networks without proper redeployment
     * 
     * It compares the stored EVM Chain ID (set at deployment) with the current
     * runtime chain ID. A mismatch indicates the contract is not running on its
     * intended network, which could allow replay attacks or unauthorized operation.
     * 
     * @return bool True if running on a different chain than intended (fork detected)
     */
    function isFork() public view returns (bool) {
        return evmChainId() != block.chainid;
    }

    /**
     * @dev Gets the registered emitter address for a given Wormhole chain
     * @param chainId_ The Wormhole chain ID to query (e.g., 52 for Aztec)
     * @return bytes32 The registered emitter contract address
     */
    function getRegisteredEmitter(uint16 chainId_) public view returns (bytes32) {
        return _state.registeredEmitters[chainId_];
    }

    /**
     * @dev Returns the finality requirement
     * @return uint8 Number of confirmations required for finality
     */
    function finality() public view returns (uint8) {
        return _state.provider.finality;
    }

    /**
     * @dev Returns the donation contract interface
     * @return IDonation interface to the donation contract for minting tokens
     */
    function donationContract() public view returns (IDonation) {
        return IDonation(_state.donationContractAddr);
    }

}