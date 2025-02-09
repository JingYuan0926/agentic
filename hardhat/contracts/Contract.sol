// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows you to increment, decrement and get the current count
contract Contract {
    uint256 private count;

    event CountUpdated(uint256 newCount);

    /// @notice Initializes the counter to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the counter by 1
    function increment() external {
        count++;
        emit CountUpdated(count);
    }

    /// @notice Decrements the counter by 1
    /// @dev Reverts if the count is already zero
    function decrement() external {
        require(count > 0, "Count is already zero");
        count--;
        emit CountUpdated(count);
    }

    /// @notice Gets the current count
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}