// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and retrieve a counter value
contract Contract {
    uint256 private counter;

    event CounterIncremented(uint256 newCounter);
    event CounterDecremented(uint256 newCounter);

    /// @notice Increments the counter by 1
    /// @dev Emits a CounterIncremented event
    function increment() external {
        counter++;
        emit CounterIncremented(counter);
    }

    /// @notice Decrements the counter by 1
    /// @dev Emits a CounterDecremented event
    /// @dev Reverts if the counter is already at zero
    function decrement() external {
        require(counter > 0, "Counter cannot be decremented below zero");
        counter--;
        emit CounterDecremented(counter);
    }

    /// @notice Returns the current value of the counter
    /// @return The current counter value
    function getCounter() external view returns (uint256) {
        return counter;
    }
}