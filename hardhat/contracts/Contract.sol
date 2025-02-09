// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and retrieve the current count
contract Contract {
    uint256 private count;

    /// @dev Emitted when the count is incremented
    event CountIncremented(uint256 newCount);

    /// @dev Emitted when the count is decremented
    event CountDecremented(uint256 newCount);

    /// @notice Initializes the count to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the counter by 1
    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }

    /// @notice Decrements the counter by 1
    /// @dev Reverts if the count is already zero
    function decrement() external {
        require(count > 0, "Count cannot be negative");
        count -= 1;
        emit CountDecremented(count);
    }

    /// @notice Returns the current count
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}