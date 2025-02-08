'use client'

import { createWeb3Modal } from '@web3modal/ethers/react'
import { defaultConfig } from '@web3modal/ethers/react'

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = 'YOUR_PROJECT_ID'

// 2. Set chains
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

// 3. Create modal
createWeb3Modal({
  ethersConfig: defaultConfig({ 
    metadata: {
      name: 'AI AVS',
      description: 'AI AVS Web3 Application',
      url: 'http://localhost:3000',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    },
    defaultChainId: 17000,
    enableEIP6963: true,
    enableInjected: true,
    enableCoinbase: true,
  }),
  chains: [holesky, sepolia],
  projectId,
  enableAnalytics: true,
  themeMode: 'light',
  themeVariables: {
    '--w3m-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    '--w3m-accent-color': '#000000',
    '--w3m-accent-fill-color': '#000000',
    '--w3m-background-color': '#FFFFFF',
    '--w3m-overlay-background-color': 'rgba(0, 0, 0, 0.3)',
    '--w3m-background-border-radius': '12px',
    '--w3m-container-border-radius': '16px',
    '--w3m-wallet-icon-border-radius': '8px',
    '--w3m-wallet-icon-large-border-radius': '12px',
    '--w3m-wallet-icon-small-border-radius': '6px',
    '--w3m-input-border-radius': '8px',
    '--w3m-button-border-radius': '8px',
    '--w3m-notification-border-radius': '12px',
    '--w3m-secondary-button-border-radius': '8px',
    '--w3m-icon-button-border-radius': '8px',
    '--w3m-button-hover-highlight-border-radius': '8px',
    '--w3m-text-big-bold-size': '20px',
    '--w3m-text-big-bold-weight': '600',
    '--w3m-text-big-bold-line-height': '24px',
    '--w3m-text-big-bold-letter-spacing': '-0.03em',
    '--w3m-text-big-bold-text-transform': 'none',
    '--w3m-text-xsmall-bold-size': '10px',
    '--w3m-text-xsmall-regular-size': '12px',
    '--w3m-text-small-thin-size': '14px',
    '--w3m-text-small-regular-size': '14px',
    '--w3m-text-small-bold-size': '14px',
    '--w3m-text-medium-regular-size': '16px',
    '--w3m-color-fg-1': '#000000',
    '--w3m-color-fg-2': '#787878',
    '--w3m-color-fg-3': '#A5A5A5',
    '--w3m-color-bg-1': '#FFFFFF',
    '--w3m-color-bg-2': '#F5F5F5',
    '--w3m-color-bg-3': '#E6E6E6',
    '--w3m-color-overlay': '#00000010'
  }
})

function Web3ModalProvider({ children }) {
  return children
}

export default Web3ModalProvider