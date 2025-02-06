require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    flow: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 545
    },
  },
  etherscan: {
    apiKey: {
      flow: "any_string"
    },
    customChains: [
      {
        network: "flow",
        chainId: 545,
        urls: {
          // Updated URLs to match Flow's EVM testnet Blockscout
          apiURL: "https://evm-testnet.flowscan.io/api",
          browserURL: "https://evm-testnet.flowscan.io"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};