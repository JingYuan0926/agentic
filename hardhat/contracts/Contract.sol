// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    uint256 private count;

    event CountUpdated(uint256 newCount);

    /// @notice Increments the counter by 1
    function increment() external {
        count++;
        emit CountUpdated(count);
    }

    /// @notice Decrements the counter by 1
    /// @dev Reverts if the counter is already at 0
    function decrement() external {
        require(count > 0, "Counter is already at zero");
        count--;
        emit CountUpdated(count);
    }

    /// @notice Gets the current value of the counter
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}