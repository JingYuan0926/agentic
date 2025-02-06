// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    // store the contract balance
    uint256 public contractBalance;
    
    // mapping to store users balances
    mapping(address => uint256) private balances;

    // password for withdrawal
    bytes32 private withdrawPassword = keccak256(abi.encodePacked("0099"));

    /**
     * @dev Function for depositing funds into the contract
     */
    function depositFunds() public payable {
        // require that deposit is greater than 0
        require(msg.value > 0, "Deposit must be greater than 0");
        // update user's balance
        balances[msg.sender] += msg.value;
        // update contract balance
        contractBalance += msg.value;
    }

    /**
     * @dev Function for withdrawing funds from the contract
     * @param _amount amount to withdraw
     * @param _password password for withdrawal
     */
    function withdrawFunds(uint256 _amount, string memory _password) public {
        // verify password
        require(keccak256(abi.encodePacked(_password)) == withdrawPassword, "Invalid password");
        // require that the user has sufficient balance
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        // subtract withdrawn amount from user's balance
        balances[msg.sender] -= _amount;
        // subtract withdrawn amount from contract balance
        contractBalance -= _amount;
        // transfer the funds
        payable(msg.sender).transfer(_amount);
    }

    /**
     * @dev Function to get user balance
     * @return user's balance
     */
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}