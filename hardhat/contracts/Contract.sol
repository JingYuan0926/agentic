// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Counter Contract
/// @notice A simple contract to manage a counter with increment, decrement, and reset functionalities
contract Contract {
    uint256 private counter;

    event CounterIncremented(uint256 newCounter);
    event CounterDecremented(uint256 newCounter);
    event CounterReset(uint256 newCounter);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increments the counter by one
    /// @dev Emits a CounterIncremented event
    function increment() external {
        counter++;
        emit CounterIncremented(counter);
    }

    /// @notice Decrements the counter by one
    /// @dev Requires the counter to be greater than zero
    /// @dev Emits a CounterDecremented event
    function decrement() external {
        require(counter > 0, "Counter cannot be less than zero");
        counter--;
        emit CounterDecremented(counter);
    }

    /// @notice Resets the counter to zero
    /// @dev Emits a CounterReset event
    function reset() external {
        counter = 0;
        emit CounterReset(counter);
    }

    /// @notice Returns the current value of the counter
    /// @return The current counter value
    function getCounter() external view returns (uint256) {
        return counter;
    }
}