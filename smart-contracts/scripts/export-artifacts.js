// QuaiForge — Artifact Export Script
// Usage:
//   npm run export-artifacts
//   node scripts/export-artifacts.js
//
// Reads the compiled Hardhat artifact for PaymentRegistry and writes:
//   ../frontend/src/lib/artifacts/paymentRegistry.json
//
// This JSON is the single source of truth for the frontend's contract
// integration layer (paymentRegistry.ts).  It contains the ABI and
// compiler metadata needed to:
//   • Create a Contract instance via quais.js / ethers.js
//   • Read the ABI for Quaiscan source verification
//
// Run this after every `npm run compile` that changes the contract.
// Commit the output file — it is pre-audited, versioned bytecode, NOT
// dynamically compiled at runtime.

const fs   = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Artifact location (output of `npx hardhat compile`)
// ---------------------------------------------------------------------------
const ARTIFACT_PATH = path.join(
  __dirname,
  "../artifacts/contracts/PaymentRegistry.sol/PaymentRegistry.json"
);

// ---------------------------------------------------------------------------
// Output — written into the frontend source tree
// ---------------------------------------------------------------------------
const OUTPUT_DIR  = path.join(__dirname, "../../frontend/src/lib/artifacts");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "paymentRegistry.json");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("QuaiForge — Artifact Export: PaymentRegistry");
  console.log("─".repeat(50));

  // ── Read artifact ─────────────────────────────────────────────────────────
  if (!fs.existsSync(ARTIFACT_PATH)) {
    console.error(`\n  ❌ Artifact not found:\n     ${ARTIFACT_PATH}`);
    console.error(`\n     Run 'npm run compile' first, then re-run this script.\n`);
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));

  // ── Sanity checks ─────────────────────────────────────────────────────────
  if (!artifact.abi || artifact.abi.length === 0) {
    console.error("  ❌ Artifact has an empty ABI — compile may have failed.");
    process.exit(1);
  }
  if (!artifact.bytecode || artifact.bytecode === "0x") {
    console.error("  ❌ Artifact has empty bytecode — compile may have failed.");
    process.exit(1);
  }

  // ── Build output ──────────────────────────────────────────────────────────
  // Pull compiler version from embedded metadata when available.
  let compilerVersion = "0.8.20";
  try {
    if (artifact.metadata) {
      const meta = JSON.parse(artifact.metadata);
      compilerVersion = meta.compiler?.version ?? compilerVersion;
    }
  } catch (_) { /* use fallback */ }

  const output = {
    contractName: "PaymentRegistry",
    templateVersion: "pay-with-blip-v1",

    // ABI — full interface; used by paymentRegistry.ts for all contract calls
    abi: artifact.abi,

    // Deployment bytecode — includes constructor; used for ContractFactory if
    // you ever need to deploy from the frontend (not required for this demo)
    bytecode: artifact.bytecode,

    // Compiler settings — required to reproduce the exact artifact on Quaiscan
    // for judge verification (compiler version + evmVersion + optimizer must match)
    compiler: {
      version:    compilerVersion,
      evmVersion: "paris",
      optimizer:  { enabled: true, runs: 200 },
    },

    // Quick stats for the console output
    _meta: {
      abiEntries:   artifact.abi.length,
      bytecodeSize: Math.round(artifact.bytecode.length / 2) - 1, // bytes
      exportedAt:   new Date().toISOString(),
    },
  };

  // ── Write output ──────────────────────────────────────────────────────────
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n  ✅ PaymentRegistry`);
  console.log(`     ABI entries  : ${output._meta.abiEntries}`);
  console.log(`     Bytecode     : ${output._meta.bytecodeSize} bytes`);
  console.log(`     Compiler     : ${compilerVersion} (evmVersion: paris, optimizer: 200 runs)`);
  console.log(`\n  📦 Written to:\n     ${OUTPUT_FILE}`);
  console.log("\n  Import in frontend (paymentRegistry.ts):");
  console.log("    import artifact from '@/lib/artifacts/paymentRegistry.json'");
  console.log("    const { abi } = artifact;\n");
}

main();
