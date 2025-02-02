// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract ExclusiveFund {
    // The only address allowed to withdraw funds.
    address public constant owner = 0x9787cfF89D30bB6Ae87Aaad9B3a02E77B5caA8f1;

    // Modifier to restrict functions to the owner only.
    modifier onlyOwner() {
        require(msg.sender == owner, "Access denied: Only the owner can execute this function");
        _;
    }

    // Constructor can accept funds upon deployment.
    constructor() payable {}

    // Allow deposits into the contract.
    function deposit() external payable {
        // The funds sent are automatically added to the contract's balance.
    }

    // Allow the contract to receive Ether directly.
    receive() external payable {}

    // Fallback function in case of calls to non-existent functions.
    fallback() external payable {}

    // Only the owner can withdraw funds.
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance in the contract");
        payable(owner).transfer(amount);
    }

    // View function to check the contract's balance.
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
