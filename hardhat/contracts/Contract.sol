// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

<<<<<<< HEAD
/// @title A simple contract for password-protected fund withdrawal
/// @notice This contract allows users to send funds and withdraw them using a password
contract Contract {
    bytes32 private passwordHash;
    address private owner;

    event FundsDeposited(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    /// @dev Sets the initial password hash and the contract owner
    constructor() {
        passwordHash = keccak256(abi.encodePacked("0000"));
        owner = msg.sender;
    }

    /// @notice Allows the contract to receive funds
    receive() external payable {
        require(msg.value > 0, "Must send some ether");
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Withdraws funds from the contract if the correct password is provided
    /// @param _password The password for withdrawal
    function withdraw(string memory _password) external {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available to withdraw");
        
        payable(msg.sender).transfer(balance);
        emit FundsWithdrawn(msg.sender, balance);
    }

    /// @notice Returns the contract's balance
    /// @return The balance of the contract
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Fallback function to prevent sending ether directly to the contract without the receive function
    fallback() external {
        revert("Direct transfers not allowed, use the deposit function");
=======
/// @title A simple counter contract
/// @notice This contract allows you to increment, decrement, and get the current count
contract Contract {
    uint256 private count;

    event CountUpdated(uint256 newCount);

    /// @dev Initializes the counter to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the counter by one
    function increment() external {
        count += 1;
        emit CountUpdated(count);
    }

    /// @notice Decrements the counter by one
    /// @dev Reverts if count is already zero
    function decrement() external {
        require(count > 0, "Count cannot be negative");
        count -= 1;
        emit CountUpdated(count);
    }

    /// @notice Retrieves the current count
    /// @return The current count
    function getCount() external view returns (uint256) {
        return count;
>>>>>>> 4345e8038073d1172688b73c5e7927036bcd9dff
    }
}