// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment and retrieve the count
contract Contract {
    uint256 private count;

    /// @dev Emitted when the count is incremented
    event CountIncremented(uint256 newCount);

    /// @notice Initializes the count to zero
    constructor() {
        count = 0;
    }

    /// @notice Increments the count by one
    /// @dev Reverts if the new count would exceed the maximum value of uint256
    function increment() external {
        unchecked {
            count++;
        }
        emit CountIncremented(count);
    }

    /// @notice Retrieves the current count
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}