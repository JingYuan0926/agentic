// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Counter Contract
/// @notice This contract allows users to increment and decrement a counter
contract Contract {
    uint256 private counter;

    event CounterIncremented(uint256 newValue);
    event CounterDecremented(uint256 newValue);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increments the counter by 1
    function increment() public {
        counter++;
        emit CounterIncremented(counter);
    }

    /// @notice Decrements the counter by 1, reverts if the counter is already zero
    function decrement() public {
        require(counter > 0, "Counter cannot be less than zero");
        counter--;
        emit CounterDecremented(counter);
    }

    /// @notice Returns the current value of the counter
    /// @return The current counter value
    function getCounter() public view returns (uint256) {
        return counter;
    }
}