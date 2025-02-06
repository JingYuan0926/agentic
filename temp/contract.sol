// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExclusiveFund {

    address public constant owner = 0x9787cfF89D30bB6Ae87Aaad9B3a02E77B5caA8f1;


    modifier onlyOwner() {
        require(msg.sender == owner, "Access denied: Only the owner can execute this function");
        _;
    }


    constructor() payable {}


    function deposit() external payable {

    }

    receive() external payable {}


    fallback() external payable {}


    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance in the contract");
        payable(owner).transfer(amount);
    }


    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
