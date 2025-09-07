// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;
import {Vault} from "../src/Vault.sol";
import {IDonation} from "../Interfaces/IDonation.sol";
import {Donation} from "../src/Donation.sol";
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract DeployVault is Script {
    function run() public returns (address vaultAddress, address donationContractAddress) {
        // Parameters for initialization - adjust as needed
        //address payable wormholeAddress = payable(0xC89Ce4735882C9F0f0FE26686c53074E09B0D550); // Devnet wormhole address
        address payable wormholeAddress = payable(0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35); // Testnet wormhole address
        uint16 chainId = 10003; // Wormhole Chain ID for Arbitrum Sepolia (where this contract runs)
        uint256 evmChainId = block.chainid; // Native EVM Chain ID (421614 for Arbitrum Sepolia, 31337 for local Anvil)
        uint8 finality = 2; 
        
        // Emitter registration info - VAAs coming FROM Aztec TO this Arbitrum contract
        bytes32 emitterAddress = hex"0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad";
        uint16 emitterChainId = 52; // Aztec's Wormhole Chain ID (source of incoming VAAs)

        vm.startBroadcast();

        // Deploy Donation contract
        Donation donation = new Donation(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        IDonation donationContract = IDonation(address(donation));
        donationContractAddress = address(donationContract);
        
        // Deploy Vault (which already inherits VaultGetters)
        Vault vault = new Vault(
            wormholeAddress,
            chainId, 
            evmChainId,
            finality,
            donationContractAddress
        );
        console.log("Vault deployed to: %s", address(vault));
                
        // Register emitter
        vault.registerEmitter(emitterChainId, emitterAddress);
        console.log("Registered emitter for chain %d", emitterChainId);
        
        // Add test function (optional)
        // This would require modifying the Vault contract to include the test function
        
        vm.stopBroadcast();
        
        return (address(vault), donationContractAddress);
    }
}