// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    bytes32 private passwordHash;

    constructor(string memory _password) {
        passwordHash = keccak256(abi.encodePacked(_password));
    }

    function withdraw(string memory _password) public payable {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password");
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {}
}
