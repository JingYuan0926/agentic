// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows users to increment, decrement, and reset a counter
contract Contract {
    uint256 private counter;
    event CounterUpdated(uint256 newCounter);

    /// @notice Initializes the counter to zero
    function initialize() public {
        counter = 0;
        emit CounterUpdated(counter);
    }

    /// @notice Increments the counter by one
    function increment() public {
        counter += 1;
        emit CounterUpdated(counter);
    }

    /// @notice Decrements the counter by one
    /// @dev Will revert if the counter is already zero
    function decrement() public {
        require(counter > 0, "Counter is already zero");
        counter -= 1;
        emit CounterUpdated(counter);
    }

    /// @notice Resets the counter to zero
    function reset() public {
        counter = 0;
        emit CounterUpdated(counter);
    }

    /// @notice Returns the current value of the counter
    /// @return The current counter value
    function getCounter() public view returns (uint256) {
        return counter;
    }
}