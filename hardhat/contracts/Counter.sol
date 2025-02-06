// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    constructor() {
        count = 0;
    }

    function getCount() public view returns (uint256) {
        return count;
    }

    function increment() public {
        count += 1;
    }

    function decrement() public {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
    }
}