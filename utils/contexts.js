export const AVS_CONTRACT_ADDRESS = '0xeD427A28Ffbd551178e12ab47cDccCc0ea9AE478';
export const HOLESKY_RPC = 'https://ethereum-holesky.publicnode.com';

export const AVS_ABI = [
    // Task Management
    'function createNewTask(string memory contents) external returns ((string contents, uint32 taskCreatedBlock))',
    'function respondToTask((string contents, uint32 taskCreatedBlock) task, uint32 referenceTaskIndex, string response, bytes memory signature) external',
    
    // Operator Management
    'function registerOperatorToAVS(address operator, (bytes signature, bytes32 salt, uint256 expiry) operatorSignature) external',
    'function deregisterOperatorFromAVS(address operator) external',
    'function operatorRegistered(address) external view returns (bool)',
    
    // Events
    'event NewTaskCreated(uint32 indexed taskIndex, (string contents, uint32 taskCreatedBlock) task)',
    'event TaskResponseReceived(uint32 indexed taskIndex, string response)',
    
    // Task Types
    'struct Task { string contents; uint32 taskCreatedBlock; }',
    'struct SignatureWithSaltAndExpiry { bytes signature; bytes32 salt; uint256 expiry; }'
];


