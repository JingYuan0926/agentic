// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment and decrement a counter
/// @dev The counter is stored as a uint256
contract Contract {
    uint256 private counter;
    event CounterUpdated(uint256 newCounter);

    /// @notice Initialize the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increment the counter by 1
    /// @dev Emits a CounterUpdated event
    function increment() external {
        counter++;
        emit CounterUpdated(counter);
    }

    /// @notice Decrement the counter by 1
    /// @dev Emits a CounterUpdated event
    function decrement() external {
        require(counter > 0, "Counter cannot go below zero");
        counter--;
        emit CounterUpdated(counter);
    }

    /// @notice Get the current value of the counter
    /// @return The current counter value
    function getCounter() external view returns (uint256) {
        return counter;
    }
}