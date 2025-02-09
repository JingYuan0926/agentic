// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows you to increment, decrement, and get the current count
contract Contract {
    uint256 private count;

    event CountUpdated(uint256 newCount);

    /// @dev Initializes the counter to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the counter by one
    function increment() external {
        count += 1;
        emit CountUpdated(count);
    }

    /// @notice Decrements the counter by one
    /// @dev Reverts if count is already zero
    function decrement() external {
        require(count > 0, "Count cannot be negative");
        count -= 1;
        emit CountUpdated(count);
    }

    /// @notice Retrieves the current count
    /// @return The current count
    function getCount() external view returns (uint256) {
        return count;
    }
}