// QuaiForge — Deployment Script: PaymentRegistry (pay-with-blip-v1)
//
// Usage:
//   npm run deploy                  → Orchard testnet
//   npm run deploy:local            → local Hardhat node
//   npx hardhat run scripts/deploy-payment-registry.js --network orchard
//
// Required env vars:
//   DEPLOYER_PRIVATE_KEY  — wallet that pays deployment gas
//
// Optional env vars (logged for reference, not passed to constructor):
//   MERCHANT_ADDRESS      — the merchant wallet address for this deployment
//
// PaymentRegistry takes no constructor arguments — all state is created
// dynamically via createInvoice().  The deploy script verifies the contract
// is live by calling deploymentSummary() after deployment.
//
// Post-deploy: copy the logged contract address into .env as CONTRACT_ADDRESS
// and into the frontend's paymentRegistry.ts REGISTRY_ADDRESS constant.

require("dotenv").config();

const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function heading(title) {
  const line = "─".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recordDeployment(address, txHash, network) {
  const outPath = path.join(__dirname, "../deploy-addresses.json");
  let record = {};

  if (fs.existsSync(outPath)) {
    try { record = JSON.parse(fs.readFileSync(outPath, "utf8")); }
    catch (_) { record = {}; }
  }

  if (!record[network]) record[network] = {};

  record[network]["pay-with-blip-v1"] = {
    contract:   "PaymentRegistry",
    address,
    txHash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + "\n");
  console.log(`\n  📝 Address recorded in deploy-addresses.json`);
  console.log(`     Add to .env:  CONTRACT_ADDRESS=${address}`);
}

function quaiscanLink(address, network) {
  if (network === "orchard") {
    console.log(`\n  🔍 Quaiscan: https://orchard.quaiscan.io/address/${address}`);
    console.log(`     Verify source code after deployment for judges.`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  heading("QuaiForge — Deploy: PaymentRegistry (pay-with-blip-v1)");

  // ── Signer ────────────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();

  console.log(`\n  Deployer : ${deployer.address}`);
  console.log(`  Network  : ${hre.network.name} (chainId: ${hre.network.config.chainId ?? "unknown"})`);

  if (process.env.MERCHANT_ADDRESS) {
    console.log(`  Merchant : ${process.env.MERCHANT_ADDRESS}`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance  : ${ethers.formatEther(balance)} QUAI`);

  if (balance === 0n) {
    console.error(
      "\n  ⚠️  Deployer balance is 0 — fund the wallet before deploying." +
      "\n     Orchard faucet: https://orchard.faucet.quai.network\n"
    );
    process.exit(1);
  }

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("\n  Deploying PaymentRegistry...");

  const factory  = await ethers.getContractFactory("PaymentRegistry");
  const contract = await factory.deploy();

  const deployTxHash = contract.deploymentTransaction()?.hash;
  console.log(`  Tx hash  : ${deployTxHash}`);
  console.log("  Waiting for confirmation...");

  const receipt = await contract.deploymentTransaction()?.wait(1);
  const address = await contract.getAddress();

  console.log(`\n  ✅ PaymentRegistry deployed at: ${address}`);
  console.log(`  Block    : ${receipt?.blockNumber}`);
  console.log(`  Gas used : ${receipt?.gasUsed?.toString()}`);

  // ── Post-deploy read-back (§6.3 pattern) ─────────────────────────────────
  console.log("\n  ── Read-back verification ───────────────────────────────");
  await sleep(1000);

  const deployed = await ethers.getContractAt("PaymentRegistry", address);
  const [nextId, templateVersion] = await deployed.deploymentSummary();

  const checks = [
    { label: "nextInvoiceId",   expected: "0",                   actual: nextId.toString() },
    { label: "templateVersion", expected: "pay-with-blip-v1",    actual: templateVersion },
  ];

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
    console.error("\n  ⚠️  READ-BACK MISMATCH — deployment verification failed!");
    process.exit(1);
  }

  console.log("\n  ✅ All read-back checks passed.");

  // ── Smoke test: create one invoice and read it back ───────────────────────
  console.log("\n  ── Smoke test: createInvoice() round-trip ───────────────");
  const testMerchant = process.env.MERCHANT_ADDRESS || deployer.address;
  const testAmount   = ethers.parseEther("0.01");
  const testOrderRef = "smoke-test-001";

  const tx = await contract.createInvoice(testMerchant, testAmount, testOrderRef);
  await tx.wait(1);

  const inv = await deployed.getInvoice(0n);
  const smokePass =
    inv.merchant.toLowerCase() === testMerchant.toLowerCase() &&
    inv.amount   === testAmount &&
    inv.orderRef === testOrderRef &&
    inv.status   === 0n; // Status.Pending

  console.log(`  ${smokePass ? "✅" : "❌"} createInvoice() → getInvoice(0) round-trip`);
  console.log(`     merchant : ${inv.merchant}`);
  console.log(`     amount   : ${ethers.formatEther(inv.amount)} QUAI`);
  console.log(`     orderRef : ${inv.orderRef}`);
  console.log(`     status   : ${["Pending","Confirmed","Cancelled"][Number(inv.status)]}`);

  if (!smokePass) {
    console.error("\n  ⚠️  Smoke test failed — invoice data mismatch!");
    process.exit(1);
  }

  console.log("\n  ✅ Smoke test passed.");

  // ── Record and link ───────────────────────────────────────────────────────
  recordDeployment(address, deployTxHash, hre.network.name);
  quaiscanLink(address, hre.network.name);

  console.log("\n  🎉 PaymentRegistry deployment complete.\n");
  console.log("  Next steps:");
  console.log("  1. Copy CONTRACT_ADDRESS into .env and frontend/src/lib/paymentRegistry.ts");
  console.log("  2. Run `npm run export-artifacts` to update frontend ABI");
  console.log("  3. Verify contract source on Quaiscan for judges\n");
}

main().catch((err) => {
  console.error("\n  ❌ Deployment failed:", err.message || err);
  process.exitCode = 1;
});
