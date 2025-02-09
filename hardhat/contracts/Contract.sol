// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A shared counter contract
/// @notice This contract allows users to increment or decrement a shared counter
contract Contract {
    uint256 private counter; // The shared counter

    /// @dev Emitted when the counter is incremented
    event CounterIncremented(uint256 newCounter);

    /// @dev Emitted when the counter is decremented
    event CounterDecremented(uint256 newCounter);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increment the counter by 1
    function increment() external {
        counter += 1;
        emit CounterIncremented(counter);
    }

    /// @notice Decrement the counter by 1
    /// @dev Requires the counter to be greater than zero to avoid underflow
    function decrement() external {
        require(counter > 0, "Counter cannot be negative");
        counter -= 1;
        emit CounterDecremented(counter);
    }

    /// @notice Returns the current value of the counter
    /// @return The current counter value
    function getCounter() external view returns (uint256) {
        return counter;
    }
}