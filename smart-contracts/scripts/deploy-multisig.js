// QuaiForge — Deployment Script: Template C (Multisig Wallet)
// Usage:
//   npx hardhat run scripts/deploy-multisig.js --network orchard
//   npx hardhat run scripts/deploy-multisig.js --network localhost
//
// Required env vars: DEPLOYER_PRIVATE_KEY
// Multisig parameters:
//   MULTISIG_SIGNERS    — comma-separated list of signer addresses
//   MULTISIG_THRESHOLD  — required confirmation count
//
// Example:
//   MULTISIG_SIGNERS=0xABC...,0xDEF...,0x123... MULTISIG_THRESHOLD=2 \
//   npx hardhat run scripts/deploy-multisig.js --network orchard

require("dotenv").config();

const { ethers } = require("hardhat");
const { heading, sleep, recordDeployment, quaiscanLink } = require("./utils/deployHelpers");

// ---------------------------------------------------------------------------
// Parse comma-separated signer list from env
// ---------------------------------------------------------------------------
function parseSigners(deployer) {
  const raw = process.env.MULTISIG_SIGNERS;
  if (!raw) {
    // Default: deployer + two demo placeholder addresses for testnet
    // In production, ALWAYS set MULTISIG_SIGNERS explicitly
    console.warn(
      "\n  ⚠️  MULTISIG_SIGNERS not set — using deployer + demo addresses. " +
      "Set MULTISIG_SIGNERS in production.\n"
    );
    return [deployer];  // will fail validation below — forces user to set it
  }
  return raw.split(",").map((a) => a.trim()).filter(Boolean);
}

async function main() {
  heading("QuaiForge — Deploy: QuaiForgeMultisig (multisig-v1)");

  // -------------------------------------------------------------------------
  // Signer
  // -------------------------------------------------------------------------
  const [deployer] = await ethers.getSigners();

  console.log(`\n  Deployer : ${deployer.address}`);
  console.log(`  Network  : ${hre.network.name}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance  : ${ethers.formatEther(balance)} QUAI`);

  if (balance === 0n) {
    console.error("\n  ⚠️  Deployer balance is 0 — fund from https://orchard.faucet.quai.network");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Build & validate parameters
  // -------------------------------------------------------------------------
  const signers   = parseSigners(deployer.address);
  const threshold = parseInt(process.env.MULTISIG_THRESHOLD || "1", 10);

  // Mirror the frontend validation rules from §5.3
  if (signers.length < 2) {
    console.error(`\n  ❌ Need at least 2 signers (got ${signers.length}). Set MULTISIG_SIGNERS=addr1,addr2,...`);
    process.exit(1);
  }
  if (threshold < 1 || threshold > signers.length) {
    console.error(`\n  ❌ Threshold must be between 1 and ${signers.length} (got ${threshold})`);
    process.exit(1);
  }

  // Check for duplicates
  const unique = new Set(signers.map((s) => s.toLowerCase()));
  if (unique.size !== signers.length) {
    console.error("\n  ❌ Duplicate addresses found in MULTISIG_SIGNERS");
    process.exit(1);
  }

  // Check for zero addresses
  if (signers.some((s) => s === ethers.ZeroAddress)) {
    console.error("\n  ❌ Zero address found in MULTISIG_SIGNERS");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Parameter summary (mirrors the Review step in the UI)
  // -------------------------------------------------------------------------
  console.log("\n  ── Multisig Parameters ───────────────────────────────");
  console.log(`  Signers (${signers.length}):`);
  signers.forEach((s, i) => console.log(`    [${i}] ${s}`));
  console.log(`  Threshold        : ${threshold} of ${signers.length}`);

  // -------------------------------------------------------------------------
  // Deploy
  // -------------------------------------------------------------------------
  console.log("\n  Deploying QuaiForgeMultisig...");

  const factory  = await ethers.getContractFactory("QuaiForgeMultisig");
  const contract = await factory.deploy(signers, threshold);

  console.log(`  Tx hash : ${contract.deploymentTransaction()?.hash}`);
  console.log("  Waiting for confirmation...");

  const receipt = await contract.deploymentTransaction()?.wait(1);
  const address = await contract.getAddress();

  console.log(`\n  ✅ QuaiForgeMultisig deployed at: ${address}`);
  console.log(`  Block    : ${receipt?.blockNumber}`);
  console.log(`  Gas used : ${receipt?.gasUsed?.toString()}`);

  // -------------------------------------------------------------------------
  // Post-deploy read-back check (§6.3)
  // -------------------------------------------------------------------------
  console.log("\n  ── Read-back verification (§6.3) ─────────────────────");
  await sleep(1000);

  const deployed = await ethers.getContractAt("QuaiForgeMultisig", address);
  const summary  = await deployed.deploymentSummary();

  const [
    rSigners,
    rThreshold,
    rTxCount,
    rBalance,
    rTemplateVersion,
  ] = summary;

  // Threshold check
  const thresholdOk = rThreshold.toString() === threshold.toString();
  console.log(`  ${thresholdOk ? "✅" : "❌"} threshold           : ${rThreshold}`);
  if (!thresholdOk) console.error(`     Expected: ${threshold}`);

  // Signer count check
  const signerCountOk = rSigners.length === signers.length;
  console.log(`  ${signerCountOk ? "✅" : "❌"} signerCount         : ${rSigners.length}`);
  if (!signerCountOk) console.error(`     Expected: ${signers.length}`);

  // Signer address check (order-insensitive)
  const deployedSignerSet = new Set(rSigners.map((s) => s.toLowerCase()));
  const expectedSignerSet = new Set(signers.map((s) => s.toLowerCase()));
  const signerSetMatch = [...deployedSignerSet].every((s) => expectedSignerSet.has(s));
  console.log(`  ${signerSetMatch ? "✅" : "❌"} signerAddresses     : ${signerSetMatch ? "match" : "MISMATCH"}`);
  if (!signerSetMatch) {
    console.error(`     Expected: ${[...expectedSignerSet].join(", ")}`);
    console.error(`     Got:      ${[...deployedSignerSet].join(", ")}`);
  }

  // Template version
  const versionOk = rTemplateVersion === "multisig-v1";
  console.log(`  ${versionOk ? "✅" : "❌"} templateVersion     : ${rTemplateVersion}`);

  // txCount should be 0 at deploy
  const txCountOk = rTxCount.toString() === "0";
  console.log(`  ${txCountOk ? "✅" : "❌"} transactionCount    : ${rTxCount}`);

  const allPassed = thresholdOk && signerCountOk && signerSetMatch && versionOk && txCountOk;
  if (!allPassed) {
    console.error("\n  ⚠️  READ-BACK MISMATCH — deployment may not match parameters!");
    process.exit(1);
  }

  console.log("\n  ✅ All read-back checks passed.");

  // -------------------------------------------------------------------------
  // Record and link
  // -------------------------------------------------------------------------
  recordDeployment("multisig-v1", address, receipt?.hash, hre.network.name);
  quaiscanLink(address, hre.network.name);

  console.log("\n  🎉 Multisig deployment complete.\n");
}

main().catch((err) => {
  console.error("\n  ❌ Deployment failed:", err.message || err);
  process.exitCode = 1;
});
