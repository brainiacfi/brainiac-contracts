/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import { HardhatUserConfig } from "hardhat/types";
import "@openzeppelin/hardhat-upgrades";

import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";
import "dotenv/config";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "./tasks";

import { ethers } from "ethers";
require("dotenv").config();

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "scanapikey";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || " ";

// npx hardhat node --fork https://v1.mainnet.godwoken.io/rpc --fork-block-number 18891277
const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: process.env.DEPLOYER!,
    admin: process.env.ADMIN!,
    guardian: process.env.GUARDIAN!,
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://v1.mainnet.godwoken.io/rpc",
      }
    },
    godwokentestnet: {
      url: `https://godwoken-testnet-v1.ckbapp.dev`,
      chainId: 71401,
      gas: 56000000,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`]
    },
    godwokenmainnet: {
      url: `https://v1.mainnet.godwoken.io/rpc`,
      chainId: 71402,
      // gas: 560000,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      gasMultiplier: 1.2
    },
    bsctestnet: {
      url:
        process.env.BSC_TESTNET_NODE ||
        "https://data-seed-prebsc-2-s1.binance.org:8545/",
      chainId: 97,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      gas: 2100000,
      gasPrice: ethers.utils.parseUnits("10", "gwei").toNumber(),
      gasMultiplier: 10,
      timeout: 12000000,
    },

    bscmainnet: {
      url: `https://bsc-dataseed.binance.org/`,
      chainId: 56,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./tests/hardhat",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
};

export default config;
