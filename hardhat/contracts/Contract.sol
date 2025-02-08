// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and retrieve a counter value
contract Contract {
    uint256 private counter;

    event CounterUpdated(uint256 newCounter);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increments the counter by one
    function increment() external {
        counter++;
        emit CounterUpdated(counter);
    }

    /// @notice Decrements the counter by one
    /// @dev Reverts if the counter is already zero
    function decrement() external {
        require(counter > 0, "Counter is already zero");
        counter--;
        emit CounterUpdated(counter);
    }

    /// @notice Retrieves the current counter value
    /// @return The current value of the counter
    function getCounter() external view returns (uint256) {
        return counter;
    }
}