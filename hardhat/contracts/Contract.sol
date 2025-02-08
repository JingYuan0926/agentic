// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple deposit and withdraw contract
/// @notice This contract allows users to deposit and withdraw funds securely with a password
contract Contract {
    // Event emitted when funds are deposited
    event Deposited(address indexed user, uint256 amount);
    
    // Event emitted when funds are withdrawn
    event Withdrawn(address indexed user, uint256 amount);
    
    // Stores the total balance of the contract
    uint256 private totalBalance;
    
    // Hash of the password for withdrawal
    bytes32 private passwordHash;

    /// @notice Constructor initializes the password hash
    constructor() {
        passwordHash = keccak256(abi.encodePacked("0099"));
    }

    /// @notice Allows users to deposit funds into the contract
    /// @dev Emits a Deposited event upon successful deposit
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        totalBalance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Allows users to withdraw funds from the contract
    /// @param _password The password required for withdrawal
    /// @param _amount The amount to withdraw
    /// @dev Emits a Withdrawn event upon successful withdrawal
    function withdraw(string calldata _password, uint256 _amount) external {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        require(_amount > 0, "Withdrawal amount must be greater than zero");
        require(_amount <= totalBalance, "Insufficient balance");

        totalBalance -= _amount;
        payable(msg.sender).transfer(_amount);
        emit Withdrawn(msg.sender, _amount);
    }

    /// @notice Returns the total balance of the contract
    /// @return The total balance in the contract
    function getBalance() external view returns (uint256) {
        return totalBalance;
    }
}