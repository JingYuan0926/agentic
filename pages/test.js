import { useState } from 'react';

const getBytecodeFromEtherscan = async (contractAddress) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
    const baseUrl = 'https://api-sepolia.etherscan.io/api';
    console.log('Fetching bytecode for contract:', contractAddress);

    // Get bytecode using eth_getCode endpoint
    const response = await fetch(
      `${baseUrl}?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch from Etherscan');
    }

    const data = await response.json();
    console.log('Etherscan response:', data);

    if (data.result && data.result !== '0x') {
      return {
        success: true,
        bytecode: data.result,
        message: 'Bytecode fetched successfully from Etherscan'
      };
    } else {
      return {
        success: false,
        error: 'No bytecode found',
        message: 'Contract not found or not verified'
      };
    }

  } catch (error) {
    console.error('Error fetching bytecode:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch bytecode'
    };
  }
};

const checkVerificationStatus = async (guid) => {
  try {
    const baseUrl = 'https://eth-sepolia.blockscout.com';
    const url = `${baseUrl}/api/v2/smart-contracts/verification/status?guid=${guid}`;
    console.log('Checking verification status at:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to check verification status');
    }

    const data = await response.json();
    console.log('Full status check response:', data);
    return data;
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
};

const verifyContractBlockscout = async (params) => {
  try {
    const baseUrl = 'https://eth-sepolia.blockscout.com';
    console.log('Starting verification with params:', {
      ...params,
      sourceCode: params.sourceCode.substring(0, 100) + '...'
    });

    // Use the standard-json-input endpoint instead
    const verifyUrl = `${baseUrl}/api/v2/smart-contracts/${params.contractAddress}/verification/via/standard-input`;
    console.log('Sending verification request to:', verifyUrl);

    // Create form data
    const formData = new FormData();
    formData.append('compiler_version', 'v0.8.20+commit.a1b79de6');
    formData.append('contract_name', 'ExclusiveFund');
    
    // Create standard JSON input
    const standardJsonInput = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: params.sourceCode
        }
      },
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        },
        evmVersion: 'london',
        outputSelection: {
          '*': {
            '*': ['*']
          }
        }
      }
    };

    // Add the files
    formData.append('files[0]', new Blob([JSON.stringify(standardJsonInput)], { type: 'application/json' }), 'input.json');
    formData.append('license_type', 'mit');

    const response = await fetch(verifyUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    console.log('Verification submission response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Verification request failed');
    }

    // Check contract status
    const statusUrl = `${baseUrl}/api/v2/smart-contracts/${params.contractAddress}`;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      console.log(`Checking verification status (attempt ${attempts + 1})...`);
      
      const statusResponse = await fetch(statusUrl);
      const statusData = await statusResponse.json();
      
      // Check for verification success
      if (statusData.verified_twin_address_hash || 
          statusData.source_code || 
          statusData.verified === true) {
        console.log('Contract verified successfully!');
        return {
          success: true,
          message: 'Contract verified successfully',
          result: statusData
        };
      }

      console.log('Contract not verified yet, waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Verification timeout after 2.5 minutes');
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
};

export default function ContractVerifier() {
  const [contractAddress, setContractAddress] = useState('0xD159Aa978d0e8856EAf60F52B99A5160b4AE611C');
  const [bytecodeResult, setBytecodeResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const [formData, setFormData] = useState({
    sourceCode: '',
    contractName: '',
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimizationRuns: 200,
    isOptimizationEnabled: true,
    evmVersion: 'london',
    licenseType: 'mit',
    constructorArguments: '',
    autodetectConstructorArgs: true
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBytecodeCheck = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBytecodeResult(null);

    try {
      const result = await getBytecodeFromEtherscan(contractAddress);
      setBytecodeResult(result);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pollVerificationStatus = async (guid) => {
    setIsPolling(true);
    try {
      let attempts = 0;
      const maxAttempts = 30; // Maximum 30 attempts (5 minutes total)
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          setError('Verification timeout. Please check the explorer manually.');
          setIsPolling(false);
          return;
        }

        const status = await checkVerificationStatus(guid);
        setVerificationStatus(status);

        if (status.status === 'pending') {
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setIsPolling(false);
        }
      };

      await poll();
    } catch (err) {
      setError(err.message);
      setIsPolling(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setVerificationResult(null);
    setVerificationStatus(null);

    try {
      const result = await verifyContractBlockscout({
        ...formData,
        contractAddress
      });
      setVerificationResult(result);

      if (result.uuid) {
        // Start polling for verification status
        pollVerificationStatus(result.uuid);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Smart Contract Verifier</h1>
      
      {/* Bytecode Check Form */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Step 1: Check Contract Bytecode</h2>
        <form onSubmit={handleBytecodeCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contract Address</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? 'Checking...' : 'Check Bytecode'}
          </button>
        </form>

        {bytecodeResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Bytecode Status:</h3>
            <p>{bytecodeResult.message}</p>
            {bytecodeResult.bytecode && (
              <pre className="mt-2 p-2 bg-gray-800 text-white rounded text-sm overflow-x-auto">
                {bytecodeResult.bytecode.substring(0, 100)}...
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Verification Form */}
      {bytecodeResult?.success && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 2: Verify Contract</h2>
          <form onSubmit={handleVerification} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Source Code</label>
              <textarea
                name="sourceCode"
                value={formData.sourceCode}
                onChange={handleInputChange}
                className="w-full p-2 border rounded h-64 font-mono text-sm"
                required
                placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.0;&#10;&#10;contract YourContract {&#10;  // Your contract source code here&#10;}"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contract Name</label>
                <input
                  type="text"
                  name="contractName"
                  value={formData.contractName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Compiler Version</label>
                <input
                  type="text"
                  name="compilerVersion"
                  value={formData.compilerVersion}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">EVM Version</label>
                <select
                  name="evmVersion"
                  value={formData.evmVersion}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="london">London</option>
                  <option value="berlin">Berlin</option>
                  <option value="istanbul">Istanbul</option>
                  <option value="petersburg">Petersburg</option>
                  <option value="constantinople">Constantinople</option>
                  <option value="byzantium">Byzantium</option>
                  <option value="shanghai">Shanghai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">License Type</label>
                <select
                  name="licenseType"
                  value={formData.licenseType}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="mit">MIT</option>
                  <option value="gnu_gpl_v3">GPL-3.0</option>
                  <option value="gnu_gpl_v2">GPL-2.0</option>
                  <option value="apache_2_0">Apache-2.0</option>
                  <option value="bsd_2_clause">BSD-2-Clause</option>
                  <option value="bsd_3_clause">BSD-3-Clause</option>
                  <option value="mpl_2_0">MPL-2.0</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Optimization Runs</label>
                <input
                  type="number"
                  name="optimizationRuns"
                  value={formData.optimizationRuns}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  min="1"
                  max="999999"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isOptimizationEnabled"
                  checked={formData.isOptimizationEnabled}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Enable Optimization</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Constructor Arguments (optional)</label>
              <input
                type="text"
                name="constructorArguments"
                value={formData.constructorArguments}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Hex encoded constructor arguments"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="autodetectConstructorArgs"
                checked={formData.autodetectConstructorArgs}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="text-sm font-medium">Autodetect Constructor Arguments</label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600 disabled:bg-green-300"
            >
              {isLoading ? 'Verifying...' : 'Verify Contract'}
            </button>
          </form>
        </div>
      )}

      {verificationResult && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
          <h2 className="font-bold">Verification Submitted:</h2>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(verificationResult, null, 2)}
          </pre>
        </div>
      )}

      {verificationStatus && (
        <div className={`mt-4 p-4 rounded ${
          verificationStatus.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          verificationStatus.status === 'success' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>
          <h2 className="font-bold">Verification Status:</h2>
          <div className="mt-2">
            <p>Status: {verificationStatus.status}</p>
            {verificationStatus.status === 'pending' && (
              <p className="mt-2">
                Verification in progress... {isPolling && '(Checking every 10 seconds)'}
              </p>
            )}
            {verificationStatus.result && (
              <pre className="mt-2 whitespace-pre-wrap">
                {JSON.stringify(verificationStatus.result, null, 2)}
              </pre>
            )}
          </div>
          {verificationStatus.status === 'success' && (
            <div className="mt-4">
              <a 
                href={`https://eth-sepolia.blockscout.com/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View Contract on Explorer
              </a>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-bold mb-2">Error:</h2>
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}
