// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Counter Contract
/// @notice A simple contract to count up and down
contract Contract {
    uint256 private count;
    event CountUpdated(uint256 newCount);

    /// @notice Initializes the counter to zero
    function initialize() external {
        count = 0;
        emit CountUpdated(count);
    }

    /// @notice Increments the counter by one
    function increment() external {
        count += 1;
        emit CountUpdated(count);
    }

    /// @notice Decrements the counter by one
    function decrement() external {
        require(count > 0, "Counter cannot go below zero");
        count -= 1;
        emit CountUpdated(count);
    }

    /// @notice Gets the current count
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}