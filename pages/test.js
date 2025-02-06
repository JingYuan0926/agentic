import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function ContractDeployer() {
  const [contractCode, setContractCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
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
}`);
  const [deploymentStatus, setDeploymentStatus] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState([]);
  const [deployedAddress, setDeployedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask!');
      }

      setDeploymentLogs(prev => [...prev, "Connecting to MetaMask..."]);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);

      // Create ethers provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setProvider(provider);
      setSigner(signer);

      // Switch to Flow network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x221' }], // 545 in hex
        });
      } catch (switchError) {
        // If Flow network isn't added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x221',
              chainName: 'Flow Testnet',
              nativeCurrency: {
                name: 'FLOW',
                symbol: 'FLOW',
                decimals: 18
              },
              rpcUrls: ['https://flow-testnet.g.alchemy.com/v2/6U7t79S89NhHIspqDQ7oKGRWp5ZOfsNj'],
              blockExplorerUrls: ['https://evm-testnet.flowscan.io']
            }]
          });
        }
      }

      // Get and format balance
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      setWalletBalance(formattedBalance);

      setDeploymentLogs(prev => [
        ...prev,
        `Connected to MetaMask: ${address}`,
        `Balance: ${formattedBalance} FLOW`
      ]);
    } catch (error) {
      console.error('Connection error:', error);
      setError(error.message);
      setDeploymentLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    if (!signer) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDeploymentLogs([`Starting deployment process...`]);

    try {
      // Compile contract
      setDeploymentLogs(prev => [...prev, "Compiling contract..."]);
      const compileResponse = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractCode }),
      });

      const compileData = await compileResponse.json();
      
      if (!compileData.success) {
        throw new Error(compileData.error || 'Compilation failed. Check the contract code.');
      }

      if (!compileData.abi || !compileData.bytecode) {
        throw new Error('Compilation succeeded but missing ABI or bytecode. Please try again.');
      }

      setDeploymentLogs(prev => [...prev, "Contract compiled successfully"]);

      // Deploy contract using MetaMask
      setDeploymentLogs(prev => [...prev, "Deploying contract..."]);
      
      // Create contract factory with explicit error handling
      let factory;
      try {
        factory = new ethers.ContractFactory(compileData.abi, compileData.bytecode, signer);
      } catch (error) {
        throw new Error(`Failed to create contract factory: ${error.message}`);
      }
      
      // Deploy with specific gas settings and error handling
      let contract;
      try {
        contract = await factory.deploy({
          gasLimit: 3000000
        });
      } catch (error) {
        throw new Error(`Failed to deploy contract: ${error.message}`);
      }
      
      setDeploymentLogs(prev => [...prev, "Waiting for deployment confirmation..."]);
      await contract.waitForDeployment();
      
      const deployedAddress = await contract.getAddress();
      setDeployedAddress(deployedAddress);
      
      setDeploymentLogs(prev => [
        ...prev,
        `Contract deployed successfully!`,
        `Address: ${deployedAddress}`
      ]);

      // Verify contract
      setDeploymentLogs(prev => [...prev, "Verifying contract..."]);
      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: deployedAddress,
          contractCode
        }),
      });

      const verifyData = await verifyResponse.json();
      
      if (verifyData.success) {
        setDeploymentLogs(prev => [...prev, "Contract verified successfully!"]);
      } else {
        setDeploymentLogs(prev => [...prev, `Verification note: ${verifyData.message}`]);
      }

      setDeploymentStatus('Deployment and verification complete!');
    } catch (error) {
      console.error('Deployment error:', error);
      setError(error.message);
      setDeploymentLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Smart Contract Deployer</h1>
      
      <form onSubmit={handleDeploy} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Contract Source Code
          </label>
          <textarea
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            className="w-full h-96 p-4 border rounded font-mono text-sm"
            placeholder="// Paste your Solidity contract code here..."
            required
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={connectWallet}
            className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
          >
            {walletAddress ? `Connected: ${walletBalance} FLOW` : 'Connect Wallet'}
          </button>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !walletAddress}
            className="flex-1 bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? 'Processing...' : 'Deploy & Verify Contract'}
          </button>
        </div>
      </form>

      {/* Deployment Logs */}
      {deploymentLogs.length > 0 && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Deployment Logs:</h3>
          <div className="space-y-1 font-mono text-sm">
            {deploymentLogs.map((log, index) => (
              <div key={index} className="text-gray-700">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Status Display */}
      {deploymentStatus && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Final Status:</h3>
          <p>{deploymentStatus}</p>
          {deployedAddress && (
            <div className="mt-2">
              <p className="font-semibold">Deployed Address:</p>
              <code className="block p-2 bg-gray-200 rounded">{deployedAddress}</code>
              <a 
                href={`https://evm-testnet.flowscan.io/address/${deployedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
              >
                View on Flow Explorer
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>Connect your wallet using the green button above</li>
          <li>Paste your Solidity contract code in the text area above</li>
          <li>Click "Deploy & Verify Contract" to start the process</li>
          <li>Wait for the deployment and verification to complete</li>
          <li>Once successful, you'll see the deployed contract address and a link to view it on the explorer</li>
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          Note: Make sure your contract is compatible with Solidity version 0.8.20 and follows proper syntax.
        </p>
      </div>
    </div>
  );
}
