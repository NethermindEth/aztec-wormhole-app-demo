// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.20;

import {Vault} from "../src/Vault.sol";
import {Donation} from "../src/Donation.sol";
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

/**
 * @title DeployVault
 * @dev Standard Foundry deployment script following industry best practices
 * 
 * Usage:
 *   # Local deployment (Anvil)
 *   forge script script/DeployVault.s.sol --rpc-url http://localhost:8545 --broadcast
 *   
 *   # Arbitrum Sepolia testnet deployment  
 *   forge script script/DeployVault.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast --verify
 *   
 * Required environment variables:
 *   PRIVATE_KEY - Deployer private key
 *   DONATION_RECEIVER - Address to receive donations
 *   
 * Optional environment variables:
 *   WORMHOLE_ADDRESS - Override Wormhole contract address
 *   AZTEC_EMITTER_ADDRESS - Override Aztec emitter address  
 *   WORMHOLE_CHAIN_ID - Override Wormhole chain ID
 *   FINALITY - Override finality blocks
 */
contract DeployVault is Script {
    function run() external returns (address vaultAddress, address donationContractAddr) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address donationReceiver = vm.envAddress("DONATION_RECEIVER");
        
        // Network-specific configuration based on chain ID
        (address wormholeAddress, uint16 wormholeChainId, uint8 finality, bytes32 aztecEmitter) = _getNetworkConfig();
        
        console.log("=== Deployment Configuration ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Donation Receiver:", donationReceiver);
        console.log("Wormhole Address:", wormholeAddress);
        console.log("Wormhole Chain ID:", wormholeChainId);
        console.log("Finality:", finality);
        console.log("=====================================");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Donation contract
        Donation donation = new Donation(donationReceiver);
        donationContractAddr = address(donation);
        console.log("Donation deployed to:", donationContractAddr);

        // Deploy Vault contract
        Vault vault = new Vault(
            payable(wormholeAddress),
            wormholeChainId,
            block.chainid,
            finality,
            donationContractAddr
        );
        vaultAddress = address(vault);
        console.log("Vault deployed to:", vaultAddress);

        // Register Aztec emitter
        vault.registerEmitter(52, aztecEmitter); // 52 = Aztec Wormhole Chain ID
        console.log("Registered Aztec emitter:", vm.toString(aztecEmitter));

        vm.stopBroadcast();

        console.log("Deployment completed successfully!");
        console.log("Donation Contract:", donationContractAddr);
        console.log("Vault Contract:", vaultAddress);
    }

    /**
     * @dev Get network-specific configuration based on chain ID
     */
    function _getNetworkConfig() internal view returns (
        address wormholeAddress,
        uint16 wormholeChainId, 
        uint8 finality,
        bytes32 aztecEmitter
    ) {
        if (block.chainid == 31337) {
            // Local Anvil - well-known addresses
            wormholeAddress = 0xC89Ce4735882C9F0f0FE26686c53074E09B0D550;
            wormholeChainId = 10003;
            finality = 2;
            aztecEmitter = 0x0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad;
        } else if (block.chainid == 421614) {
            // Arbitrum Sepolia - can override via env vars
            wormholeAddress = vm.envOr("WORMHOLE_ADDRESS", address(0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35));
            wormholeChainId = uint16(vm.envOr("WORMHOLE_CHAIN_ID", uint256(10003)));
            finality = uint8(vm.envOr("FINALITY", uint256(2)));
            aztecEmitter = vm.envOr("AZTEC_EMITTER_ADDRESS", bytes32(0x0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad));
        } else {
            revert(string.concat("Unsupported chain ID: ", vm.toString(block.chainid), " (only local and testnet supported)"));
        }
    }
}