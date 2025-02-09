// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple contract for password-protected fund transfers
/// @notice This contract allows users to transfer Ether to a friend with password protection for withdrawal
contract Contract {
    bytes32 private passwordHash;
    address private owner;
    mapping(address => uint256) private balances;

    event FundsTransferred(address indexed to, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    /// @notice Initializes the contract and sets the password
    constructor() {
        owner = msg.sender;
        passwordHash = keccak256(abi.encodePacked("0000"));
    }

    /// @notice Transfers Ether to a specified address
    /// @param _to The address of the friend to receive the funds
    /// @param _amount The amount of Ether to transfer
    function transferFunds(address payable _to, uint256 _amount) external payable {
        require(msg.value == _amount, "Sent value must match the amount specified");
        require(_to != address(0), "Invalid address");

        balances[_to] += _amount;
        emit FundsTransferred(_to, _amount);
    }

    /// @notice Withdraws funds for the specified address after password verification
    /// @param _password The password to verify
    function withdrawFunds(string calldata _password) external {
        require(balances[msg.sender] > 0, "No funds available for withdrawal");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
    }

    /// @notice Returns the balance of the sender
    /// @return The balance of the caller
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
}