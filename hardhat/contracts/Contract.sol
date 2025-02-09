// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple fund transfer contract with password protection
/// @notice This contract allows you to send funds to a friend, which can be withdrawn using a password
contract Contract {
    // State variables
    address public owner;
    address public recipient;
    uint256 public amount;
    bytes32 private passwordHash;

    // Events
    event FundsSent(address indexed from, address indexed to, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event PasswordUpdated(bytes32 newPasswordHash);

    /// @notice Initializes the contract with the recipient's address and the password
    /// @param _recipient Address of the recipient
    /// @param _password The password to withdraw funds (unhashed)
    function initialize(address _recipient, string memory _password) public {
        require(owner == address(0), "Contract already initialized");
        require(_recipient != address(0), "Invalid recipient address");
        
        owner = msg.sender;
        recipient = _recipient;
        passwordHash = keccak256(abi.encodePacked(_password));
    }

    /// @notice Sends funds to the specified recipient
    /// @dev This function is payable and can be called to send Ether
    function sendFunds() public payable {
        require(msg.value > 0, "Must send a positive amount");
        require(msg.sender == owner, "Only the owner can send funds");
        
        amount += msg.value;
        emit FundsSent(msg.sender, recipient, msg.value);
    }

    /// @notice Withdraws funds by the recipient using the correct password
    /// @param _password The password to verify
    function withdrawFunds(string memory _password) public {
        require(msg.sender == recipient, "Only the recipient can withdraw funds");
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        require(amount > 0, "No funds available for withdrawal");
        
        uint256 withdrawAmount = amount;
        amount = 0; // Reset the amount before transfer to prevent re-entrancy
        payable(recipient).transfer(withdrawAmount);
        
        emit FundsWithdrawn(recipient, withdrawAmount);
    }

    /// @notice Updates the withdrawal password
    /// @param _newPassword The new password to set (unhashed)
    function updatePassword(string memory _newPassword) public {
        require(msg.sender == owner, "Only the owner can update the password");
        passwordHash = keccak256(abi.encodePacked(_newPassword));
        
        emit PasswordUpdated(passwordHash);
    }

    /// @notice Retrieves the balance of the contract
    /// @return The current balance of the contract
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}