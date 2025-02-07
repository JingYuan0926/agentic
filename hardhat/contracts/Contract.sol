// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple fund deposit and withdrawal contract
/// @notice This contract allows users to deposit and withdraw funds with a password
contract Contract {
    mapping(address => uint256) private balances;
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice Deposit funds into the contract
    /// @dev Users can deposit any amount of Ether
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw funds from the contract
    /// @param amount The amount of Ether to withdraw
    /// @param password The password required for withdrawal
    /// @dev The provided password must match the predefined password
    function withdraw(uint256 amount, uint256 password) external {
        require(password == 99, "Invalid password");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Get the balance of the caller
    /// @return The balance of the caller in wei
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
}