// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    address public ownerA;
    address public ownerB;
    uint public requiredConfirmations = 2;

    struct Transaction {
        address to;
        uint value;
        bool executed;
        uint confirmations;
    }

    mapping(uint => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    event Deposit(address indexed sender, uint amount);
    event TransactionSubmitted(uint indexed txId, address indexed to, uint value);
    event TransactionConfirmed(uint indexed txId, address indexed owner);
    event TransactionExecuted(uint indexed txId);

    modifier onlyOwner() {
        require(msg.sender == ownerA || msg.sender == ownerB, "Not an owner");
        _;
    }

    constructor() {
        ownerA = msg.sender;
        ownerB = msg.sender; // For testing, setting both owners to deployer
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submitTransaction(address _to, uint _value) public onlyOwner {
        transactions.push(Transaction({to: _to, value: _value, executed: false, confirmations: 0}));
        emit TransactionSubmitted(transactions.length - 1, _to, _value);
    }

    function confirmTransaction(uint _txId) public onlyOwner {
        require(_txId < transactions.length, "Transaction does not exist");
        require(!isConfirmed[_txId][msg.sender], "Already confirmed");
        
        isConfirmed[_txId][msg.sender] = true;
        transactions[_txId].confirmations++;
        emit TransactionConfirmed(_txId, msg.sender);
    }

    function executeTransaction(uint _txId) public onlyOwner {
        require(_txId < transactions.length, "Transaction does not exist");
        Transaction storage transaction = transactions[_txId];
        require(transaction.confirmations >= requiredConfirmations, "Not enough confirmations");
        require(!transaction.executed, "Transaction already executed");
        
        transaction.executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}("");
        require(success, "Transaction failed");
        
        emit TransactionExecuted(_txId);
    }
}