// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment and retrieve a counter value
contract Contract {
    uint256 private count;

    /// @notice Emitted when the counter is incremented
    /// @param newCount The new value of the counter
    event CounterIncremented(uint256 newCount);

    /// @notice Initializes the counter to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the counter by one
    function increment() public {
        count += 1;
        emit CounterIncremented(count);
    }

    /// @notice Retrieves the current value of the counter
    /// @return The current counter value
    function getCount() public view returns (uint256) {
        return count;
    }
}