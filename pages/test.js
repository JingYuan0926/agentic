import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function TestPage() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [teamResponse, setTeamResponse] = useState(null);
  const [contractResult, setContractResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [teamUpdates, setTeamUpdates] = useState([]);
  
  // Wallet states
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contractABI, setContractABI] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask!');
      }

      setTeamUpdates(prev => [...prev, "System: Connecting to MetaMask..."]);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setProvider(provider);
      setSigner(signer);

      // Switch to Flow network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x221' }],
        });
      } catch (switchError) {
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
              rpcUrls: ['https://flow-testnet.g.alchemy.com/v2/your-api-key'],
              blockExplorerUrls: ['https://evm-testnet.flowscan.io']
            }]
          });
        }
      }

      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      setWalletBalance(formattedBalance);

      setTeamUpdates(prev => [
        ...prev,
        `System: Connected to MetaMask: ${address}`,
        `System: Balance: ${formattedBalance} FLOW`
      ]);
    } catch (error) {
      console.error('Connection error:', error);
      setTeamUpdates(prev => [...prev, `System Error: ${error.message}`]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setResult(null);
    setTeamResponse(null);
    setContractResult(null);
    setLogs([]);
    setTeamUpdates([]);

    try {
      // First, get intent from Finn
      const finnResponse = await fetch('/api/finn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const finnData = await finnResponse.json();
      if (!finnResponse.ok) {
        setError(finnData.teamResponse);
        return;
      }

      setResult(finnData.intent);
      setTeamUpdates(prev => [...prev, finnData.teamResponse]);

      // Handle different intents
      if (finnData.intent === 'generate') {
        // Call Codey for contract generation
        const codeyResponse = await fetch('/api/codey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: message }),
        });

        const codeyData = await codeyResponse.json();
        if (!codeyResponse.ok) throw new Error('Contract generation failed');

        setContractResult(codeyData);
        setLogs(prev => [...prev, ...(codeyData.logs || [])]);
        setTeamUpdates(prev => [...prev, ...(codeyData.teamUpdates || [])]);
        
        // Store contract details if deployed
        if (codeyData.success && codeyData.abi) {
          setContractABI(codeyData.abi);
          setContractAddress(codeyData.deployedAddress);
        }

      } else if (finnData.intent === 'interact') {
        // Call Vee to identify function
        const veeResponse = await fetch('/api/vee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            contractABI,
            userQuery: message
          }),
        });

        const veeData = await veeResponse.json();
        setLogs(prev => [...prev, ...(veeData.logs || [])]);
        setTeamUpdates(prev => [...prev, ...(veeData.teamUpdates || [])]);

        if (veeData.success) {
          // Call Dex to extract parameters
          const dexResponse = await fetch('/api/dex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [],
              functionInfo: veeData.function,
              userQuery: message
            }),
          });

          const dexData = await dexResponse.json();
          setLogs(prev => [...prev, ...(dexData.logs || [])]);
          setTeamUpdates(prev => [...prev, ...(dexData.teamUpdates || [])]);

          if (dexData.success) {
            // Execute the contract function
            const contract = new ethers.Contract(
              contractAddress,
              contractABI,
              signer
            );

            const tx = await contract[veeData.function.name](
              ...dexData.params
            );
            
            setTeamUpdates(prev => [...prev, 
              `System: Transaction sent! Hash: ${tx.hash}`
            ]);
          }
        }
      }
    } catch (err) {
      setError('An error occurred during processing');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">AI Team Test Interface</h1>
      
      {/* Wallet Connection */}
      <div className="mb-6">
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          {walletAddress 
            ? `Connected: ${walletBalance} FLOW`
            : 'Connect Wallet'
          }
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message here..."
            className="w-full p-2 border rounded-md min-h-[100px]"
          />
        </div>
        
        <button
          type="submit"
          disabled={!walletAddress}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          Submit Request
        </button>
      </form>

      {/* Team Communication Section */}
      {teamUpdates.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h2 className="font-semibold mb-2">Team Communication:</h2>
          <div className="space-y-2">
            {teamUpdates.map((update, index) => (
              <p key={`update-${index}`} className="text-blue-800">{update}</p>
            ))}
          </div>
        </div>
      )}

      {/* Intent Result */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 rounded-md">
          <h2 className="font-semibold mb-2">Detected Intent:</h2>
          <p className="text-green-700">{result}</p>
        </div>
      )}

      {/* Contract Generation Result */}
      {contractResult && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <h2 className="font-semibold mb-2">Generated Contract:</h2>
            <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
              <code>{contractResult.contractCode}</code>
            </pre>
          </div>

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-md">
              <h2 className="font-semibold mb-2">Process Updates:</h2>
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <p key={index} className="text-gray-700">{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Updated Example Messages */}
      <div className="mt-8 text-sm text-gray-600">
        <p>Try these example messages:</p>
        <ul className="list-disc ml-5 mt-2">
          <li>"Create an NFT contract with mint function"</li>
          <li>"Mint a new NFT to address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"</li>
          <li>"What's the total supply of the token?"</li>
        </ul>
      </div>
    </div>
  );
}
