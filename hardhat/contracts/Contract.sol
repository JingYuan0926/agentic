// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Contract for password-protected fund withdrawal
/// @notice This contract allows users to transfer funds and withdraw them using a password
contract Contract {
    // Event emitted when funds are deposited
    event Deposited(address indexed sender, uint256 amount);
    
    // Event emitted when funds are withdrawn
    event Withdrawn(address indexed recipient, uint256 amount);

    // Store the password hash
    bytes32 private passwordHash;

    // Mapping to store balances
    mapping(address => uint256) private balances;

    /// @notice Constructor that initializes the password hash
    constructor() {
        passwordHash = keccak256(abi.encodePacked("0000"));
    }

    /// @notice Deposit funds into the contract
    /// @dev This function is payable and allows users to send Ether to the contract
    function deposit() external payable {
        require(msg.value > 0, "Must send Ether to deposit");
        
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw funds from the contract
    /// @param _password The password provided by the user for withdrawal
    /// @dev Only the sender can withdraw their own funds
    function withdraw(string calldata _password) external {
        require(balances[msg.sender] > 0, "No funds available for withdrawal");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0; // Reset balance before transfer to prevent reentrancy

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Get the balance of the caller
    /// @return The balance of the caller in Wei
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
}