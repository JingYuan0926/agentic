// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Donation Pool Contract
/// @notice This contract allows users to donate money to a pool and withdraw funds securely with password protection.
contract Contract {
    // State variables
    address public owner;
    uint256 public totalDonations;
    bytes32 private passwordHash;
    
    // Events
    event Donated(address indexed donor, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event PasswordChanged(address indexed owner);

    /// @notice Constructor to initialize the contract with a password hash
    constructor() {
        owner = msg.sender;
        passwordHash = keccak256(abi.encodePacked("0099"));
    }

    /// @notice Allows users to donate to the pool
    /// @dev Updates total donations and emits a donation event
    function donate() external payable {
        require(msg.value > 0, "Donation must be greater than zero");
        totalDonations += msg.value;
        emit Donated(msg.sender, msg.value);
    }

    /// @notice Allows the owner to withdraw funds from the pool
    /// @param _password The password to authorize the withdrawal
    /// @dev Validates the password and transfers the total donations to the owner
    function withdraw(string calldata _password) external {
        require(msg.sender == owner, "Only the owner can withdraw");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        
        uint256 amount = totalDonations;
        totalDonations = 0; // Reset total donations before transfer to prevent re-entrancy
        payable(owner).transfer(amount);
        emit Withdrawn(owner, amount);
    }

    /// @notice Allows the owner to change the withdrawal password
    /// @param newPassword The new password to set
    /// @dev Validates the new password is not empty
    function changePassword(string calldata newPassword) external {
        require(msg.sender == owner, "Only the owner can change the password");
        require(bytes(newPassword).length > 0, "Password cannot be empty");

        passwordHash = keccak256(abi.encodePacked(newPassword));
        emit PasswordChanged(owner);
    }
}