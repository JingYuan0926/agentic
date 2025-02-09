// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows you to increment, decrement, and retrieve a counter value
contract Contract {
    uint256 private counter;

    /// @notice Emitted when the counter is incremented
    /// @param newValue The new value of the counter
    event CounterIncremented(uint256 newValue);

    /// @notice Emitted when the counter is decremented
    /// @param newValue The new value of the counter
    event CounterDecremented(uint256 newValue);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increments the counter by one
    /// @dev Emits a CounterIncremented event
    function increment() external {
        counter += 1;
        emit CounterIncremented(counter);
    }

    /// @notice Decrements the counter by one
    /// @dev Emits a CounterDecremented event
    /// @dev Requires the counter to be greater than zero
    function decrement() external {
        require(counter > 0, "Counter cannot be negative");
        counter -= 1;
        emit CounterDecremented(counter);
    }

    /// @notice Retrieves the current value of the counter
    /// @return The current counter value
    function getCounter() external view returns (uint256) {
        return counter;
    }
}