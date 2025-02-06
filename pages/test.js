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

export default function BytecodeFetcher() {
  const [contractAddress, setContractAddress] = useState('0xD159Aa978d0e8856EAf60F52B99A5160b4AE611C');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid contract address format');
      }

      const response = await getBytecodeFromEtherscan(contractAddress);
      if (!response.success) {
        throw new Error(response.message);
      }
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Contract Bytecode Fetcher (Sepolia)</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Contract Address
          </label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Fetching...' : 'Get Bytecode'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-bold mb-2">Error:</h2>
          <div>{error}</div>
          <div className="mt-2 text-sm">
            Make sure you:
            <ul className="list-disc ml-5 mt-1">
              <li>Have set up your ETHERSCAN_API_KEY in .env</li>
              <li>Are using a valid contract address</li>
              <li>The contract exists on Sepolia network</li>
            </ul>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">Result:</h2>
          <div className="p-4 bg-gray-100 rounded">
            <div className="mb-2">
              <span className="font-semibold">Status:</span> {result.message}
            </div>
            <div>
              <span className="font-semibold">Bytecode:</span>
              <pre className="mt-2 p-4 bg-gray-800 text-white rounded overflow-x-auto text-sm">
                {result.bytecode || 'No bytecode found'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
