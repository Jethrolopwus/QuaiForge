// QuaiForge — Artifact Export Script
// Usage:  node scripts/export-artifacts.js
//         npm run export-artifacts
//
// Reads the compiled Hardhat artifacts for all three templates and writes:
//   ../frontend/src/lib/artifacts/templateRegistry.json
//
// This JSON file is the single source of truth for the frontend deployment
// pipeline (§5.4 of the architectural design).  The frontend templateRegistry.ts
// imports from it to obtain the ABI and bytecode for ContractFactory.deploy().
//
// Run this after every `npx hardhat compile` that produces new artifacts.
// The output file is committed to the frontend source tree (it is pre-audited,
// versioned bytecode — NOT dynamically compiled at runtime, per §5.4).

const fs   = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Template definitions — one entry per v1 template
// ---------------------------------------------------------------------------
const TEMPLATES = [
  {
    id:           "token-v1",
    name:         "ERC-20 Token",
    description:  "A fixed-supply ERC-20 token with an owner. No post-deploy minting.",
    artifactPath: "../artifacts/contracts/QuaiForgeToken.sol/QuaiForgeToken.json",
    constructorParams: [
      { name: "name",          type: "string",  label: "Token Name",     description: "Display name of the token (e.g. CommunityCoin)" },
      { name: "symbol",        type: "string",  label: "Symbol",         description: "Ticker symbol, max 11 characters (e.g. CMC)" },
      { name: "initialSupply", type: "uint256", label: "Initial Supply", description: "Total whole tokens to mint (e.g. 1000000)" },
      { name: "owner",         type: "address", label: "Owner Address",  description: "Address that receives the minted supply. Defaults to your wallet." },
    ],
  },
  {
    id:           "escrow-v1",
    name:         "Escrow",
    description:  "Two-party escrow. Supports arbiter-controlled release or time-locked automatic release.",
    artifactPath: "../artifacts/contracts/QuaiForgeEscrow.sol/QuaiForgeEscrow.json",
    constructorParams: [
      { name: "payer",            type: "address", label: "Payer Address",       description: "Address authorised to deposit funds" },
      { name: "payee",            type: "address", label: "Payee Address",        description: "Address that receives released funds" },
      { name: "arbiter",          type: "address", label: "Arbiter Address",      description: "Mediator address (required for ARBITER_RELEASE; use 0x0 for TIMELOCK)" },
      { name: "releaseMode",      type: "uint8",   label: "Release Mode",         description: "0 = ARBITER_RELEASE, 1 = TIMELOCK" },
      { name: "timelockDuration", type: "uint256", label: "Timelock Duration (s)", description: "Seconds until anyone can release (TIMELOCK mode only; 0 for ARBITER_RELEASE)" },
    ],
  },
  {
    id:           "multisig-v1",
    name:         "Multisig Wallet",
    description:  "M-of-N multisig wallet. Requires threshold confirmations to execute transactions.",
    artifactPath: "../artifacts/contracts/QuaiForgeMultisig.sol/QuaiForgeMultisig.json",
    constructorParams: [
      { name: "signers",   type: "address[]", label: "Signer Addresses", description: "List of wallet addresses that can sign (minimum 2, no duplicates)" },
      { name: "threshold", type: "uint256",   label: "Threshold",        description: "Number of confirmations required to execute (1 ≤ threshold ≤ signers.length)" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Output path — relative to the smart-contracts directory
// ---------------------------------------------------------------------------
const OUTPUT_DIR  = path.join(__dirname, "../../frontend/src/lib/artifacts");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "templateRegistry.json");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("QuaiForge — Artifact Export");
  console.log("─".repeat(50));

  const registry = {};

  for (const template of TEMPLATES) {
    const artifactPath = path.join(__dirname, template.artifactPath);

    if (!fs.existsSync(artifactPath)) {
      console.error(`\n  ❌ Artifact not found: ${artifactPath}`);
      console.error(`     Run 'npx hardhat compile' first.\n`);
      process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Sanity checks
    if (!artifact.abi || artifact.abi.length === 0) {
      console.error(`  ❌ Empty ABI in artifact for ${template.id}`);
      process.exit(1);
    }
    if (!artifact.bytecode || artifact.bytecode === "0x") {
      console.error(`  ❌ Empty bytecode in artifact for ${template.id}`);
      process.exit(1);
    }

    registry[template.id] = {
      id:                template.id,
      name:              template.name,
      description:       template.description,
      constructorParams: template.constructorParams,
      // ABI: full array — frontend uses this for ContractFactory and read-back calls
      abi:               artifact.abi,
      // bytecode: deployment bytecode (includes constructor)
      bytecode:          artifact.bytecode,
      // Compiler settings recorded for Quaiscan verification (§6.4)
      compiler: {
        version:     artifact.metadata ? JSON.parse(artifact.metadata).compiler?.version : "0.8.20",
        evmVersion:  "paris",
        optimizer:   { enabled: true, runs: 200 },
      },
    };

    const abiEntries  = artifact.abi.length;
    const bytecodeLen = artifact.bytecode.length;
    console.log(`  ✅ ${template.id.padEnd(15)} ABI: ${abiEntries} entries, bytecode: ${bytecodeLen} chars`);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write the registry JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(registry, null, 2) + "\n");

  console.log(`\n  📦 Written to: ${OUTPUT_FILE}`);
  console.log("\n  Done. Import in frontend:");
  console.log("  import templateRegistry from '@/lib/artifacts/templateRegistry.json'");
  console.log("  const { abi, bytecode } = templateRegistry['token-v1'];\n");
}

main();
