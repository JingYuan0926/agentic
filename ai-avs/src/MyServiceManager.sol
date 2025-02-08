// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISignatureUtils} from "eigenlayer-contracts/src/contracts/interfaces/ISignatureUtils.sol";
import {IAVSDirectory} from "eigenlayer-contracts/src/contracts/interfaces/IAVSDirectory.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

contract MyServiceManager {
    using ECDSA for bytes32;

    // State
    address public immutable avsDirectory;
    uint32 public latestTaskNum;
    mapping(address => bool) public operatorRegistered;
    mapping(uint32 => bytes32) public allTaskHashes;
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;
    
    // Add AI public key as state variable
    address public immutable aiPublicKey;

    // Events
    event NewTaskCreated(uint32 indexed taskIndex, Task task);

    event TaskResponded(
        uint32 indexed taskIndex,
        Task task,
        string response,
        address operator
    );

    // Types
    struct Task {
        bytes32 hashBeforeSign;
        bytes signature;
    }

    // Modifiers
    modifier onlyOperator() {
        require(operatorRegistered[msg.sender], "Operator must be the caller");
        _;
    }

    // Constructor
    constructor(address _avsDirectory, address _aiPublicKey) {
        avsDirectory = _avsDirectory;
        aiPublicKey = _aiPublicKey;
    }

    // Register Operator
    function registerOperatorToAVS(
        address operator,
        ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature
    ) external {
        IAVSDirectory(avsDirectory).registerOperatorToAVS(
            operator,
            operatorSignature
        );
        operatorRegistered[operator] = true;
    }

    // Deregister Operator
    function deregisterOperatorFromAVS(address operator) external onlyOperator {
        require(msg.sender == operator);
        IAVSDirectory(avsDirectory).deregisterOperatorFromAVS(operator);
        operatorRegistered[operator] = false;
    }

    // Create Task
    function createNewTask(
        bytes32 hashBeforeSign,
        bytes memory signature
    ) external returns (Task memory) {
        // Verify AI signature before creating task
        bytes32 aiMessageHash = hashBeforeSign.toEthSignedMessageHash();
        address recoveredSigner = aiMessageHash.recover(signature);
        require(recoveredSigner == aiPublicKey, "Invalid AI signature");

        Task memory newTask;
        newTask.hashBeforeSign = hashBeforeSign;
        newTask.signature = signature;

        allTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        emit NewTaskCreated(latestTaskNum, newTask);
        latestTaskNum = latestTaskNum + 1;

        return newTask;
    }

    // Respond to Task
    function respondToTask(
        Task calldata task,
        uint32 referenceTaskIndex,
        string calldata response,
        bytes memory signature
    ) external onlyOperator {
        // Verify task hash matches stored hash
        require(
            keccak256(abi.encode(task)) == allTaskHashes[referenceTaskIndex],
            "supplied task does not match the one recorded in the contract"
        );
        require(
            allTaskResponses[msg.sender][referenceTaskIndex].length == 0,
            "Operator has already responded to the task"
        );

        // Verify AI signature
        bytes32 aiMessageHash = task.hashBeforeSign.toEthSignedMessageHash();
        address recoveredSigner = aiMessageHash.recover(task.signature);
        require(recoveredSigner == aiPublicKey, "Invalid AI signature");

        // Verify operator's signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                recoveredSigner == aiPublicKey,  // bool
                task.hashBeforeSign              // bytes32
            )
        ).toEthSignedMessageHash();
        
        address operatorSigner = messageHash.recover(signature);
        require(operatorSigner == msg.sender, "Invalid operator signature");

        // Store response
        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        // Emit event
        emit TaskResponded(referenceTaskIndex, task, response, msg.sender);
    }
}
