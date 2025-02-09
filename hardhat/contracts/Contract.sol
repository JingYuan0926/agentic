// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and retrieve the counter value
contract Contract {
    uint256 private counter;

    event CounterUpdated(uint256 newValue);

    /// @notice Initializes the counter to zero
    function initialize() public {
        counter = 0;
        emit CounterUpdated(counter);
    }

    /// @notice Increments the counter by one
    function increment() public {
        counter++;
        emit CounterUpdated(counter);
    }

    /// @notice Decrements the counter by one
    /// @dev Requires the counter to be greater than zero to avoid underflow
    function decrement() public {
        require(counter > 0, "Counter cannot be negative");
        counter--;
        emit CounterUpdated(counter);
    }

    /// @notice Retrieves the current counter value
    /// @return The current value of the counter
    function getCounter() public view returns (uint256) {
        return counter;
    }
}