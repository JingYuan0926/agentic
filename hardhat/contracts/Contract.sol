// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows for incrementing, decrementing, and retrieving a counter value
contract Contract {
    uint256 private counter;

    /// @dev Emitted when the counter is incremented
    event CounterIncremented(uint256 newCounterValue);

    /// @dev Emitted when the counter is decremented
    event CounterDecremented(uint256 newCounterValue);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increments the counter by one
    /// @dev Emits a CounterIncremented event
    function increment() external {
        counter++;
        emit CounterIncremented(counter);
    }

    /// @notice Decrements the counter by one, ensuring it does not go below zero
    /// @dev Emits a CounterDecremented event
    function decrement() external {
        require(counter > 0, "Counter cannot be negative");
        counter--;
        emit CounterDecremented(counter);
    }

    /// @notice Retrieves the current value of the counter
    /// @return The current counter value
    function getCounterValue() external view returns (uint256) {
        return counter;
    }
}