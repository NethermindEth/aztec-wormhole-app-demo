// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDonation {
    function donate(uint256 amount) external;
    function receiver() external view returns (address);
}
