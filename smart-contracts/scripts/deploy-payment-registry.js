// QuaiForge — Deployment Script: PaymentRegistry (pay-with-blip-v1)
//
// Usage:
//   npm run deploy                  → Orchard testnet
//   npx hardhat run scripts/deploy-payment-registry.js --network orchard
//
// Uses the quais SDK (a maintained Ethers v6 fork) instead of stock ethers.
// quais handles Quai's custom transaction wire-format and quai_* RPC namespace
// automatically — this is required; stock ethers produces standard Ethereum
// RLP-encoded transactions that Quai nodes reject with a wire-format error.

require("dotenv").config();

const quais    = require("quais");
const hreModule = require("hardhat");
const fs        = require("fs");
const path      = require("path");

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

// ---------------------------------------------------------------------------
// waitForReceipt — polls getTransactionReceipt every 5 s (3 min max).
// quais provider routes to the correct shard automatically via usePathing.
// ---------------------------------------------------------------------------
async function waitForReceipt(provider, txHash, { interval = 5000, timeout = 180_000 } = {}) {
  const deadline = Date.now() + timeout;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    await sleep(interval);
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.blockNumber) {
        console.log(`  ✅ Confirmed on attempt ${attempt} (block ${receipt.blockNumber})`);
        return receipt;
      }
    } catch (e) {
      // Quai Orchard propagates receipts before blocks are fully available —
      // "block not found" during polling is expected; keep retrying.
      if (!e.message?.includes("block not found")) {
        console.log(`  ⏳ Attempt ${attempt}: ${e.message?.slice(0, 80)}`);
      }
    }
    console.log(`  ⏳ Attempt ${attempt}: pending — retrying in ${interval / 1000}s...`);
  }
  throw new Error("Timed out waiting for receipt after 3 minutes.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  heading("QuaiForge — Deploy: PaymentRegistry (pay-with-blip-v1)");

  const rpcUrl     = process.env.ORCHARD_RPC_URL || "https://orchard.rpc.quai.network/cyprus1";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error("\n  ❌ DEPLOYER_PRIVATE_KEY not set in .env\n");
    process.exit(1);
  }

  // quais.JsonRpcProvider with usePathing: true
  //   • Routes RPCs to the correct shard based on the address prefix
  //   • Uses the quai_* JSON-RPC namespace automatically
  //   • Serializes transactions in Quai's wire format (not standard Ethereum RLP)

  // const provider = new quais.JsonRpcProvider(rpcUrl, undefined, { usePathing: true });
  const provider = new quais.JsonRpcProvider(rpcUrl,{ chainId: 15000, name: "orchard" },{ usePathing: false, staticNetwork: true });
  const wallet   = new quais.Wallet(privateKey, provider);

  const deployerAddress  = wallet.address;
  const merchantAddress  = process.env.MERCHANT_ADDRESS || deployerAddress;

  // quai_chainId to confirm we're on the right network
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`\n  Deployer : ${deployerAddress}`);
  console.log(`  Network  : orchard (chainId: ${chainId})`);
  console.log(`  Merchant : ${merchantAddress}`);

  const balance = await provider.getBalance(deployerAddress);
  console.log(`  Balance  : ${quais.formatQuai(balance)} QUAI`);

  if (balance === 0n) {
    console.error("\n  ⚠️  Balance is 0 — fund wallet at https://orchard.faucet.quai.network\n");
    process.exit(1);
  }

  // ── Load artifact ─────────────────────────────────────────────────────────
  const artifact = await hreModule.artifacts.readArtifact("PaymentRegistry");

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("\n  Deploying PaymentRegistry...");

  // quais.ContractFactory uses the quais wallet which:
  //   1. Serializes the deployment tx in Quai's protobuf wire format
  //   2. Sends via quai_sendRawTransaction (not eth_sendRawTransaction)
  // quais also auto-grinds the contract address to land in the correct shard.
  // const factory  = new quais.ContractFactory(artifact.abi, artifact.bytecode, wallet);



// Workaround: quais@1.0.0-alpha.56's ContractFactory.deploy() has a bug where
// omitting the 4th (ipfsHash) constructor arg falls back to the literal string
// "IPFSHash" instead of null (looks like an `x || "IPFSHash"` typo upstream),
// which then fails the SDK's own 46-char validation. PaymentRegistry doesn't
// use real IPFS metadata (see hardhat.config.js), so this dummy CIDv0-shaped
// string is a harmless placeholder — nothing checks that it resolves on IPFS.
const dummyIpfsHash = "QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx";
const factory = new quais.ContractFactory(artifact.abi, artifact.bytecode, wallet, dummyIpfsHash);
  const contract = await factory.deploy();

  const deployTxHash = contract.deploymentTransaction()?.hash;
  console.log(`  Tx hash  : ${deployTxHash}`);
  console.log(`  View on Quaiscan: https://orchard.quaiscan.io/tx/${deployTxHash}`);
  console.log("  Waiting for deployment to be mined...");

  // waitForDeployment polls until the contract address is on-chain
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n  ✅ PaymentRegistry deployed at: ${address}`);
  console.log(`  View on Quaiscan: https://orchard.quaiscan.io/address/${address}`);

  // Fetch the receipt for block/gas info
  const receipt = deployTxHash
    ? await provider.getTransactionReceipt(deployTxHash).catch(() => null)
    : null;
  if (receipt) {
    console.log(`  Block    : ${receipt.blockNumber}`);
    console.log(`  Gas used : ${receipt.gasUsed?.toString()}`);
  }

  // ── Read-back verification ────────────────────────────────────────────────
  console.log("\n  ── Read-back verification ───────────────────────────────");
  await sleep(3000);

  const deployed = new quais.Contract(address, artifact.abi, provider);
  const [nextId, templateVersion] = await deployed.deploymentSummary();

  const checks = [
    { label: "nextInvoiceId",   expected: "0",                actual: nextId.toString() },
    { label: "templateVersion", expected: "pay-with-blip-v1", actual: templateVersion   },
  ];

  let allPassed = true;
  for (const { label, expected, actual } of checks) {
    const pass = expected === actual;
    console.log(`  ${pass ? "✅" : "❌"} ${label.padEnd(20)}: ${actual}`);
    if (!pass) { console.error(`     Expected: ${expected}`); allPassed = false; }
  }

  if (!allPassed) {
    console.error("\n  ⚠️  READ-BACK MISMATCH — verify the contract manually!");
    process.exit(1);
  }
  console.log("\n  ✅ All read-back checks passed.");

  // ── Smoke test ────────────────────────────────────────────────────────────
  console.log("\n  ── Smoke test: createInvoice() round-trip ───────────────");
  const testMerchant = merchantAddress;
  const testAmount   = quais.parseQuai("0.01");
  const testOrderRef = "smoke-test-001";

  const deployedWithSigner = new quais.Contract(address, artifact.abi, wallet);
  const smokeTx = await deployedWithSigner.createInvoice(testMerchant, testAmount, testOrderRef);
  console.log(`  Smoke tx : ${smokeTx.hash}`);
  await waitForReceipt(provider, smokeTx.hash);

  const inv = await deployed.getInvoice(0n);
  const smokePass =
    inv.merchant.toLowerCase() === testMerchant.toLowerCase() &&
    inv.amount   === testAmount &&
    inv.orderRef === testOrderRef &&
    inv.status   === 0n;

  console.log(`  ${smokePass ? "✅" : "❌"} createInvoice() → getInvoice(0) round-trip`);
  console.log(`     merchant : ${inv.merchant}`);
  console.log(`     amount   : ${quais.formatQuai(inv.amount)} QUAI`);
  console.log(`     orderRef : ${inv.orderRef}`);
  console.log(`     status   : ${["Pending", "Confirmed", "Cancelled"][Number(inv.status)]}`);

  if (!smokePass) {
    console.error("\n  ⚠️  Smoke test failed — invoice data mismatch!");
    process.exit(1);
  }
  console.log("\n  ✅ Smoke test passed.");

  // ── Record ────────────────────────────────────────────────────────────────
  recordDeployment(address, deployTxHash ?? "unknown", "orchard");

  console.log("\n  🎉 PaymentRegistry deployment complete.\n");
  console.log("  Next steps:");
  console.log("  1. Add to .env:        CONTRACT_ADDRESS=" + address);
  console.log("  2. Run:                npm run export-artifacts");
  console.log("  3. Verify on Quaiscan: https://orchard.quaiscan.io/address/" + address + "\n");
}

main().catch((err) => {
  console.error("\n  ❌ Deployment failed:", err.message || err);
  process.exitCode = 1;
});
