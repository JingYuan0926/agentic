// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and reset a counter
contract Contract {
    uint256 private count;
    event CountUpdated(uint256 newCount);

    /// @notice Initializes the counter to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the counter by one
    function increment() external {
        count++;
        emit CountUpdated(count);
    }

    /// @notice Decrements the counter by one
    /// @dev Requires the counter to be greater than zero
    function decrement() external {
        require(count > 0, "Counter cannot be less than zero");
        count--;
        emit CountUpdated(count);
    }

    /// @notice Resets the counter to zero
    function reset() external {
        count = 0;
        emit CountUpdated(count);
    }

    /// @notice Returns the current value of the counter
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}