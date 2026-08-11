// QuaiForge — Hardhat Configuration
// Target: Orchard Testnet, Cyprus-1 shard
// Solidity pinned to 0.8.20 — hard ceiling on Quai (anything newer fails to deploy)
//
// NOTE on quai-hardhat-plugin:
//   The plugin intercepts the compile task to use the SolidityX binary, which is
//   needed only for contracts that use QIP-2 (Quai-specific) opcodes.
//   QuaiForge's three v1 templates (Token, Escrow, Multisig) are pure standard
//   EVM contracts — they do NOT use any QIP-2 opcodes — so standard solc 0.8.20
//   produces the correct artifacts.  The plugin is therefore NOT required here.
//   If you later add contracts that use Quai-native opcodes, re-enable the plugin
//   and set up the SolidityX binary path in solidityx.compilerPath.
//
// Deployment to Orchard testnet works with standard ethers/hardhat deploy scripts
// via the orchard network config below — no plugin required for that either.

require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  // --------------------------------------------------------------------------
  // Solidity — pinned exact version, no floating pragma
  // --------------------------------------------------------------------------
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        // 200 runs: good balance between deploy cost and per-call cost.
        // IMPORTANT: record this value for Quaiscan contract verification (§6.4).
        runs: 200,
      },
      // paris = highest EVM version fully supported by Quai's EVM environment.
      // Do not use a later EVM version — opcodes like PUSH0 (Shanghai) may fail.
      evmVersion: "paris",
    },
  },

  // --------------------------------------------------------------------------
  // Networks
  // --------------------------------------------------------------------------
  networks: {
    // Orchard testnet — Cyprus-1 shard (only shard needed for v1 templates)
    orchard: {
      url: process.env.ORCHARD_RPC_URL || "https://orchard.rpc.quai.network/cyprus1",
      chainId: 15000,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // localhost for local tests (npx hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },

  // Default to orchard for deployment scripts.
  // Tests run against the built-in hardhat in-process network:
  //   npx hardhat test --network hardhat
  //   npm test   (package.json script adds --network hardhat)
  defaultNetwork: "orchard",

  // --------------------------------------------------------------------------
  // Artifact paths
  // --------------------------------------------------------------------------
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
    scripts:   "./scripts",
  },

  // --------------------------------------------------------------------------
  // Mocha test timeout — Orchard block times can be slower than localhost
  // --------------------------------------------------------------------------
  mocha: {
    timeout: 120_000, // 2 minutes
  },
};
