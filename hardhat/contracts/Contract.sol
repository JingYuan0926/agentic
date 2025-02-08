// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple deposit and withdrawal smart contract
/// @notice This contract allows users to deposit and withdraw funds with a password
contract Contract {
    mapping(address => uint256) private balances;
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice Deposit funds into the contract
    /// @dev Requires a positive amount to deposit
    /// @param amount The amount of funds to deposit
    function deposit(uint256 amount) external {
        require(amount > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw funds from the contract
    /// @dev Requires the correct password and sufficient balance
    /// @param amount The amount of funds to withdraw
    /// @param password The password required to authorize the withdrawal
    function withdraw(uint256 amount, uint256 password) external {
        require(password == 9999, "Invalid password");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Get the balance of the caller
    /// @return The balance of the caller
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
}