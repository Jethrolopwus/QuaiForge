// QuaiForge — Deployment Script: Template B (Escrow)
// Usage:
//   npx hardhat run scripts/deploy-escrow.js --network orchard
//   npx hardhat run scripts/deploy-escrow.js --network localhost
//
// Required env vars: DEPLOYER_PRIVATE_KEY
// Escrow parameters: ESCROW_PAYER, ESCROW_PAYEE, ESCROW_RELEASE_MODE,
//                    ESCROW_ARBITER (arbiter mode only),
//                    ESCROW_TIMELOCK_DURATION (timelock mode only, in seconds)
//
// ESCROW_RELEASE_MODE values:
//   0 = ARBITER_RELEASE  (arbiter decides when to release or refund)
//   1 = TIMELOCK         (anyone can release after the timelock expires)

require("dotenv").config();

const { ethers } = require("hardhat");
const { heading, sleep, recordDeployment, quaiscanLink } = require("./utils/deployHelpers");

// Release mode enum mirrors the contract
const ReleaseMode = { ARBITER_RELEASE: 0, TIMELOCK: 1 };

// ---------------------------------------------------------------------------
// Deployment parameters — override via environment variables
// ---------------------------------------------------------------------------
function buildParams(deployer) {
  const mode = parseInt(process.env.ESCROW_RELEASE_MODE ?? "0", 10);

  if (mode === ReleaseMode.ARBITER_RELEASE) {
    return {
      payer:            process.env.ESCROW_PAYER   || deployer,
      payee:            process.env.ESCROW_PAYEE,
      arbiter:          process.env.ESCROW_ARBITER,
      releaseMode:      ReleaseMode.ARBITER_RELEASE,
      timelockDuration: 0,
    };
  } else {
    return {
      payer:            process.env.ESCROW_PAYER   || deployer,
      payee:            process.env.ESCROW_PAYEE,
      arbiter:          ethers.ZeroAddress,          // ignored in TIMELOCK mode
      releaseMode:      ReleaseMode.TIMELOCK,
      // Default: 7 days in seconds; override with ESCROW_TIMELOCK_DURATION
      timelockDuration: parseInt(process.env.ESCROW_TIMELOCK_DURATION || "604800", 10),
    };
  }
}

async function main() {
  heading("QuaiForge — Deploy: QuaiForgeEscrow (escrow-v1)");

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
  const p = buildParams(deployer.address);

  if (!p.payee) {
    console.error("\n  ❌ ESCROW_PAYEE env var is required — set a valid Quai address");
    process.exit(1);
  }
  if (p.releaseMode === ReleaseMode.ARBITER_RELEASE && !p.arbiter) {
    console.error("\n  ❌ ESCROW_ARBITER env var is required for ARBITER_RELEASE mode");
    process.exit(1);
  }
  if (p.releaseMode === ReleaseMode.TIMELOCK && p.timelockDuration <= 0) {
    console.error("\n  ❌ ESCROW_TIMELOCK_DURATION must be > 0 for TIMELOCK mode");
    process.exit(1);
  }

  const modeName = p.releaseMode === ReleaseMode.ARBITER_RELEASE ? "ARBITER_RELEASE" : "TIMELOCK";

  // -------------------------------------------------------------------------
  // Parameter summary (mirrors the Review step in the UI)
  // -------------------------------------------------------------------------
  console.log("\n  ── Escrow Parameters ─────────────────────────────────");
  console.log(`  Payer            : ${p.payer}`);
  console.log(`  Payee            : ${p.payee}`);
  console.log(`  Release Mode     : ${modeName} (${p.releaseMode})`);
  if (p.releaseMode === ReleaseMode.ARBITER_RELEASE) {
    console.log(`  Arbiter          : ${p.arbiter}`);
  } else {
    const days = (p.timelockDuration / 86400).toFixed(2);
    console.log(`  Timelock Duration: ${p.timelockDuration}s (~${days} days)`);
  }

  // -------------------------------------------------------------------------
  // Deploy
  // -------------------------------------------------------------------------
  console.log("\n  Deploying QuaiForgeEscrow...");

  const factory  = await ethers.getContractFactory("QuaiForgeEscrow");
  const contract = await factory.deploy(
    p.payer,
    p.payee,
    p.arbiter,
    p.releaseMode,
    p.timelockDuration
  );

  console.log(`  Tx hash : ${contract.deploymentTransaction()?.hash}`);
  console.log("  Waiting for confirmation...");

  const receipt = await contract.deploymentTransaction()?.wait(1);
  const address = await contract.getAddress();

  console.log(`\n  ✅ QuaiForgeEscrow deployed at: ${address}`);
  console.log(`  Block    : ${receipt?.blockNumber}`);
  console.log(`  Gas used : ${receipt?.gasUsed?.toString()}`);

  // -------------------------------------------------------------------------
  // Post-deploy read-back check (§6.3)
  // -------------------------------------------------------------------------
  console.log("\n  ── Read-back verification (§6.3) ─────────────────────");
  await sleep(1000);

  const deployed = await ethers.getContractAt("QuaiForgeEscrow", address);
  const summary  = await deployed.deploymentSummary();

  const [
    rPayer,
    rPayee,
    rArbiter,
    rReleaseMode,
    rTimelockDeadline,
    rState,
    rTemplateVersion,
  ] = summary;

  const checks = [
    { label: "payer",           expected: p.payer.toLowerCase(),   actual: rPayer.toLowerCase() },
    { label: "payee",           expected: p.payee.toLowerCase(),   actual: rPayee.toLowerCase() },
    { label: "releaseMode",     expected: p.releaseMode.toString(), actual: rReleaseMode.toString() },
    { label: "state",           expected: "0",                      actual: rState.toString() },  // AWAITING_DEPOSIT
    { label: "templateVersion", expected: "escrow-v1",             actual: rTemplateVersion },
  ];

  if (p.releaseMode === ReleaseMode.ARBITER_RELEASE) {
    checks.push({ label: "arbiter", expected: p.arbiter.toLowerCase(), actual: rArbiter.toLowerCase() });
    checks.push({ label: "timelockDeadline", expected: "0", actual: rTimelockDeadline.toString() });
  } else {
    // Deadline will be block.timestamp + duration; just check it's in the future
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(rTimelockDeadline);
    const timelockOk = deadline > now;
    console.log(`  ${timelockOk ? "✅" : "❌"} timelockDeadline     : ${deadline} (${timelockOk ? "in the future ✓" : "INVALID — in the past!"})`);
  }

  let allPassed = true;
  for (const { label, expected, actual } of checks) {
    const pass = expected === actual;
    console.log(`  ${pass ? "✅" : "❌"} ${label.padEnd(20)}: ${actual}`);
    if (!pass) {
      console.error(`     Expected: ${expected}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error("\n  ⚠️  READ-BACK MISMATCH — deployment may not match parameters!");
    process.exit(1);
  }

  console.log("\n  ✅ All read-back checks passed.");

  // -------------------------------------------------------------------------
  // Record and link
  // -------------------------------------------------------------------------
  recordDeployment("escrow-v1", address, receipt?.hash, hre.network.name);
  quaiscanLink(address, hre.network.name);

  console.log("\n  🎉 Escrow deployment complete.\n");
}

main().catch((err) => {
  console.error("\n  ❌ Deployment failed:", err.message || err);
  process.exitCode = 1;
});
