// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and retrieve the counter value
contract Contract {
    uint256 private counter;
    bytes32 private passwordHash;

    event CounterIncremented(uint256 newCounter);
    event CounterDecremented(uint256 newCounter);
    event Withdraw(address indexed to, uint256 amount);

    /// @notice Initializes the contract with a password hash
    function initialize() public {
        require(passwordHash == bytes32(0), "Contract already initialized");
        passwordHash = keccak256(abi.encodePacked("0000"));
        counter = 0;
    }

    /// @notice Increments the counter by 1
    function increment() public {
        counter++;
        emit CounterIncremented(counter);
    }

    /// @notice Decrements the counter by 1
    function decrement() public {
        require(counter > 0, "Counter cannot go below zero");
        counter--;
        emit CounterDecremented(counter);
    }

    /// @notice Retrieves the current counter value
    /// @return The current value of the counter
    function getCounter() public view returns (uint256) {
        return counter;
    }

    /// @notice Withdraws funds from the contract if the correct password is provided
    /// @param _password The password to validate
    /// @param _to The address to send the funds to
    /// @param _amount The amount to withdraw
    function withdraw(string memory _password, address payable _to, uint256 _amount) public payable {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        require(address(this).balance >= _amount, "Insufficient balance");

        _to.transfer(_amount);
        emit Withdraw(_to, _amount);
    }

    /// @notice Allows the contract to receive Ether
    receive() external payable {}
}