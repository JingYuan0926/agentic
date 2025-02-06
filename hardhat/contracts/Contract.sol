// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Counter contract
 */
contract Contract {
    uint256 private _count;

    /**
     * @dev Constructor that initializes the count to zero.
     */
    constructor() {
        _count = 0;
    }

    /**
     * @dev Function that increments the counter by one.
     */
    function increment() public {
        _count += 1;
    }

    /**
     * @dev Function that decrements the counter by one.
     */
    function decrement() public {
        require(_count > 0, "Counter is already at 0, can't decrement");
        _count -= 1;
    }

    /**
     * @dev Returns the current count
     * @return uint256 The current count
     */
    function getCount() public view returns (uint256) {
        return _count;
    }
}