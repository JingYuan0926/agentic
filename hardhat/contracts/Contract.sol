// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple contract for managing funds with password protection
contract Contract {
    bytes32 private passwordHash;
    address private owner;

    event FundsDeposited(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Initializes the contract setting the owner and password hash
    function initialize() external {
        require(owner == address(0), "Contract is already initialized");
        owner = msg.sender;
        passwordHash = keccak256(abi.encodePacked("0000")); // Set initial password hash
    }

    /// @notice Allows the owner to deposit funds into the contract
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH to deposit");
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Allows the owner to withdraw funds from the contract
    /// @param _password The password to authorize withdrawal
    function withdraw(string calldata _password) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        payable(owner).transfer(balance);
        emit FundsWithdrawn(owner, balance);
    }

    /// @notice Returns the current balance of the contract
    /// @return The balance of the contract
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}