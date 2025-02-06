// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @title Contract
 * @dev Implements a basic counter with increment and decrement functionality
 */
contract Contract {
    uint256 private count;

    /**
     * @dev Constructor that sets the initial count to zero.
     */
    constructor() {
        count = 0;
    }

    /**
     * @dev Function to get the current count
     * @return Returns the current count
     */
    function getCount() public view returns (uint256) {
        return count;
    }

    /**
     * @dev Function to increment the count by 1
     * @return Returns the new count
     */
    function increment() public returns (uint256) {
        count += 1;
        return count;
    }

    /**
     * @dev Function to decrement the count by 1
     * @return Returns the new count
     */
    function decrement() public returns (uint256) {
        require(count > 0, "Decrement failed, count is already at 0");
        count -= 1;
        return count;
    }
}