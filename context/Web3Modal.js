'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = 'YOUR_PROJECT_ID'

// 2. Set chains - Including Flow Testnet
const flow = {
  chainId: 545,
  name: 'Flow Testnet',
  currency: 'FLOW',
  explorerUrl: 'https://evm-testnet.flowscan.io',
  rpcUrl: 'https://flow-testnet.g.alchemy.com/v2/6U7t79S89NhHIspqDQ7oKGRWp5ZOfsNj'
}

const holesky = {
  chainId: 17000,
  name: 'Holesky',
  currency: 'ETH',
  explorerUrl: 'https://holesky.etherscan.io',
  rpcUrl: 'https://ethereum-holesky.publicnode.com'
}

const sepolia = {
  chainId: 11155111,
  name: 'Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://ethereum-sepolia.publicnode.com'
}

// 3. Create a metadata object
const metadata = {
  name: 'AI AVS',
  description: 'AI AVS Web3 Application',
  url: 'http://localhost:3000',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,

  /*Optional*/
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: false, // Disable other wallets
  enableWalletConnect: false, // Disable WalletConnect
  rpcUrl: 'https://flow-testnet.g.alchemy.com/v2/6U7t79S89NhHIspqDQ7oKGRWp5ZOfsNj', // Default to Flow RPC
  defaultChainId: 545 // Default to Flow Testnet
})

// 5. Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [flow, holesky, sepolia], // Include Flow network
  projectId,
  
  // Theme customization
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#1E88E5', // Flow blue color
    '--w3m-border-radius-master': '4px'
  },
  
  enableAnalytics: true,
})

function Web3ModalProvider({ children }) {
  return children
}

export default Web3ModalProvider