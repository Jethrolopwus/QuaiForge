// QuaiForge — Hardhat Configuration
// Target: Quai Orchard Testnet, Cyprus-1 shard
//
// Contract: PaymentRegistry (pay-with-blip-v1)
//   • No OpenZeppelin — zero-dependency contract
//   • Solidity pinned to 0.8.20 — hard ceiling on Quai Orchard
//   • EVM version locked to paris — PUSH0 (Shanghai) and later opcodes are not
//     supported on Quai; anything higher than paris will fail to deploy
//   • Standard CREATE (no CREATE2) — quais.js auto-grinds the shard-prefixed
//     contract address at deployment; CREATE2 breaks that grinding
//   • quai-hardhat-plugin is NOT required — PaymentRegistry uses zero QIP-2
//     opcodes; standard solc 0.8.20 produces correct artifacts for Orchard
//
// Networks:
//   orchard   — Orchard testnet, chainId 15000
//   localhost — local Hardhat node for testing
//
// Default network: orchard (deploy scripts target testnet by default)
// Tests always pass --network hardhat (the in-process network)

require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  // --------------------------------------------------------------------------
  // Solidity — exact pinned version, no floating pragma
  // --------------------------------------------------------------------------
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        // 200 runs: standard balance between deploy cost and call cost.
        // Record this value when verifying on Quaiscan (compiler settings must match).
        runs: 200,
      },
      // paris = highest EVM version fully supported by Quai's EVM environment.
      // Do NOT change to shanghai, cancun, or later.
      evmVersion: "paris",
    },
  },

  // --------------------------------------------------------------------------
  // Networks
  // --------------------------------------------------------------------------
  networks: {
    // Orchard testnet — Cyprus-1 shard
    // Fund deployer: https://orchard.faucet.quai.network
    orchard: {
      url:      process.env.ORCHARD_RPC_URL || "https://orchard.rpc.quai.network/cyprus1",
      chainId:  15000,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // Local node — used for interactive development
    localhost: {
      url:     "http://127.0.0.1:8545",
      chainId: 1337,
    },

    // hardhat (in-process) is the implicit default for `npx hardhat test`
  },

  // Deployment scripts default to orchard.
  // Tests use the in-process Hardhat network:
  //   npm test                       → --network hardhat (set in package.json script)
  //   npx hardhat test --network hardhat
  defaultNetwork: "orchard",

  // --------------------------------------------------------------------------
  // Paths
  // --------------------------------------------------------------------------
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
    scripts:   "./scripts",
  },

  // --------------------------------------------------------------------------
  // Mocha — generous timeout for Orchard block times during live-network tests
  // --------------------------------------------------------------------------
  mocha: {
    timeout: 120_000, // 2 minutes
  },
};
