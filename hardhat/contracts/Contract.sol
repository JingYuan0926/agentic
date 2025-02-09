// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    /// @notice The current count
    uint256 public count;

    /// @notice Event emitted when the count is updated
    event CountUpdated(uint256 newCount);

    /// @notice Event emitted when an invalid password is provided
    event InvalidPassword();

    /// @notice The password hash for authentication
    bytes32 private passwordHash;

    /// @notice Constructor to initialize the contract
    constructor() {
        passwordHash = keccak256(abi.encodePacked("0000"));
    }

    /// @notice Function to increment the count by 1
    /// @param _password The password to authenticate the transaction
    function increment(string memory _password) public payable {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        count += 1;
        emit CountUpdated(count);
    }

    /// @notice Function to decrement the count by 1
    /// @param _password The password to authenticate the transaction
    function decrement(string memory _password) public payable {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        require(count > 0, "Count cannot be negative");
        count -= 1;
        emit CountUpdated(count);
    }

    /// @notice Function to add a custom value to the count
    /// @param _password The password to authenticate the transaction
    /// @param _value The value to add to the count
    function add(string memory _password, uint256 _value) public payable {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        require(_value > 0, "Value must be positive");
        count += _value;
        emit CountUpdated(count);
    }

    /// @notice Function to subtract a custom value from the count
    /// @param _password The password to authenticate the transaction
    /// @param _value The value to subtract from the count
    function subtract(string memory _password, uint256 _value) public payable {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        require(_value > 0, "Value must be positive");
        require(count >= _value, "Insufficient count");
        count -= _value;
        emit CountUpdated(count);
    }

    /// @notice Function to update the password
    /// @param _oldPassword The current password
    /// @param _newPassword The new password
    function updatePassword(string memory _oldPassword, string memory _newPassword) public payable {
        require(keccak256(abi.encodePacked(_oldPassword)) == passwordHash, "Invalid old password");
        require(bytes(_newPassword).length > 0, "New password cannot be empty");
        passwordHash = keccak256(abi.encodePacked(_newPassword));
    }

    /// @notice Function to get the current count
    /// @return The current count
    function getCount() public view returns (uint256) {
        return count;
    }
}