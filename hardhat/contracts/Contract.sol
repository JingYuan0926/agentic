// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

<<<<<<< HEAD
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
=======
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
>>>>>>> 9f98c2dc1988f875343f1010678ed07fb5b3ad08
}