// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    address private owner;
    mapping(address => uint256) private balances;
    uint256 private contractBalance;
    uint256 private constant PASSWORD = 99;

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deposits funds into the contract.
    /// @param _amount The amount of funds to deposit.
    function deposit(uint256 _amount) public payable {
        require(msg.value == _amount, "Incorrect amount sent");
        balances[msg.sender] += _amount;
        contractBalance += _amount;
    }

    /// @notice Withdraws funds from the contract.
    /// @param _amount The amount of funds to withdraw.
    /// @param _pwd The password required for withdrawal.
    function withdraw(uint256 _amount, uint256 _pwd) public {
        require(_pwd == PASSWORD, "Incorrect password");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(contractBalance >= _amount, "Contract balance is low");
        balances[msg.sender] -= _amount;
        contractBalance -= _amount;
        payable(msg.sender).transfer(_amount);
    }

    /// @notice Returns the contract balance.
    /// @return The contract balance.
    function getContractBalance() public view returns (uint256) {
        return contractBalance;
    }

    /// @notice Returns the user balance.
    /// @return The user balance.
    function getUserBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}