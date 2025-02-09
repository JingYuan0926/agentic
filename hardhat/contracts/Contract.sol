// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Simple Password Protected Contract
/// @notice This contract allows for secure withdrawal of funds using a password.
contract Contract {
    bytes32 private passwordHash;
    event FundsWithdrawn(address indexed to, uint256 amount);
    event PasswordChanged();

    /// @notice Initializes the contract with a default password hash.
    function initialize() external {
        require(passwordHash == 0, "Contract already initialized");
        passwordHash = keccak256(abi.encodePacked("0000"));
    }

    /// @notice Allows the sender to withdraw funds if they provide the correct password.
    /// @param _password The password to authorize the withdrawal.
    function withdraw(string calldata _password) external payable {
        require(msg.value > 0, "Must send funds to withdraw");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        
        payable(msg.sender).transfer(msg.value);
        emit FundsWithdrawn(msg.sender, msg.value);
    }

    /// @notice Allows the owner to change the password.
    /// @param _newPassword The new password to set.
    function changePassword(string calldata _newPassword) external {
        passwordHash = keccak256(abi.encodePacked(_newPassword));
        emit PasswordChanged();
    }

    /// @notice Allows the contract to receive Ether.
    receive() external payable {}
}