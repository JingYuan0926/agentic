// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Simple Fund Transfer Contract with Password Protection
/// @notice This contract allows sending funds to a specified address and requires a password to withdraw them.
contract Contract {
    address public owner;
    bytes32 private passwordHash;
    mapping(address => uint256) public balances;

    event FundsDeposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    /// @notice Constructor initializes the contract with a password hash
    constructor() {
        owner = msg.sender;
        passwordHash = keccak256(abi.encodePacked("0000"));
    }

    /// @notice Allows the owner to deposit funds to the contract
    /// @dev This function is payable
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Withdraws funds from the contract after password verification
    /// @param _password The password to verify
    /// @dev This function is payable
    function withdraw(string memory _password) external {
        require(balances[msg.sender] > 0, "No funds available for withdrawal");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }
}