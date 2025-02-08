// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title A simple counter contract
/// @notice This contract allows incrementing and decrementing a counter
contract Contract {
    uint256 private counter;

    event CounterIncreased(uint256 newCounter);
    event CounterDecreased(uint256 newCounter);

    /// @notice Initializes the counter to zero
    constructor() {
        counter = 0;
    }

    /// @notice Increments the counter by one
    function increment() external {
        counter++;
        emit CounterIncreased(counter);
    }

    /// @notice Decrements the counter by one
    /// @dev Reverts if the counter is already zero
    function decrement() external {
        require(counter > 0, "Counter cannot be less than zero");
        counter--;
        emit CounterDecreased(counter);
    }

    /// @notice Returns the current value of the counter
    /// @return The current counter value
    function getCounter() external view returns (uint256) {
        return counter;
    }
}