// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple deposit and withdrawal contract with password protection
/// @dev This contract allows users to deposit and withdraw funds securely
contract Contract {
    // Store password hash
    bytes32 private passwordHash;
    // Mapping to keep track of user balances
    mapping(address => uint256) private balances;
    // Event to log deposits
    event Deposited(address indexed user, uint256 amount);
    // Event to log withdrawals
    event Withdrawn(address indexed user, uint256 amount);

    /// @dev Sets the initial password hash, callable only by contract owner
    /// @param _passwordHash The hash of the password to set
    function setPasswordHash(bytes32 _passwordHash) external {
        require(passwordHash == 0, "Password hash already set");
        passwordHash = _passwordHash;
    }

    /// @dev Allows users to deposit funds into the contract
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @dev Allows users to withdraw funds from the contract with the correct password
    /// @param _password The password provided by the user
    /// @param _amount The amount to withdraw
    function withdraw(bytes32 _password, uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(verifyPassword(_password), "Invalid password");
        balances[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
        emit Withdrawn(msg.sender, _amount);
    }

    /// @dev Verifies the password by comparing hashed input
    /// @param _password The password provided by the user to verify
    /// @return True if the password matches, false otherwise
    function verifyPassword(bytes32 _password) private view returns (bool) {
        return passwordHash == keccak256(abi.encodePacked(_password));
    }

    /// @dev Returns the balance of the caller
    /// @return The balance of the caller
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
}