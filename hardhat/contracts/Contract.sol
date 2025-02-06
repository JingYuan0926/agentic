// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Contract {
    string public meme;

    event MemeUpdated(string oldMeme, string newMeme);

    // Constructor to initialize the contract with a meme
    constructor() {
        meme = "Why did the smart contract break up? It needed more gas!";
    }

    // Function to update the meme
    function setMeme(string calldata newMeme) public {
        emit MemeUpdated(meme, newMeme);
        meme = newMeme;
    }

    // Function to retrieve a funny message
    function laugh() public pure returns (string memory) {
        return "Hahaha, that's hilarious!";
    }
}