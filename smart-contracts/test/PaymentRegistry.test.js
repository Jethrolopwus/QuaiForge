// QuaiForge — Test Suite: PaymentRegistry (pay-with-blip-v1)
//
// Run:
//   npm test
//   npx hardhat test test/PaymentRegistry.test.js --network hardhat
//
// Coverage:
//   ✓ Deployment — initial state, TEMPLATE_VERSION, deploymentSummary()
//   ✓ createInvoice() — success path, all input validation, event emission,
//                       auto-incrementing IDs, getInvoice() read-back
//   ✓ confirmPayment() — success path, event emission, state update,
//                        duplicate confirmation rejection, wrong-status rejection,
//                        non-existent invoice rejection, zero-address payer rejection
//   ✓ cancelInvoice()  — success path, event emission, state update,
//                        double-cancel rejection, wrong-status rejection,
//                        non-existent invoice rejection
//   ✓ getInvoice()     — returns correct struct, reverts on non-existent ID
//   ✓ getStatus()      — returns correct enum value, reverts on non-existent ID
//   ✓ deploymentSummary() — reflects nextInvoiceId changes after creates
//   ✓ Cross-function ordering — confirm then cancel should fail, cancel then confirm should fail

const { expect } = require("chai");
const { ethers }  = require("hardhat");

// Status enum mirrors the contract (ethers v6 returns BigInt from uint8)
const Status = { Pending: 0n, Confirmed: 1n, Cancelled: 2n };

const ONE_QUAI  = ethers.parseEther("1");
const HALF_QUAI = ethers.parseEther("0.5");

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("PaymentRegistry", function () {
  let registry;
  let deployer, merchant, payer, stranger;

  // Deploy a fresh contract before every test
  beforeEach(async () => {
    [deployer, merchant, payer, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PaymentRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────────────
  describe("deployment", () => {
    it("deploys successfully and has a non-zero address", async () => {
      expect(await registry.getAddress()).to.be.properAddress;
    });

    it("TEMPLATE_VERSION is 'pay-with-blip-v1'", async () => {
      expect(await registry.TEMPLATE_VERSION()).to.equal("pay-with-blip-v1");
    });

    it("nextInvoiceId starts at 0", async () => {
      expect(await registry.nextInvoiceId()).to.equal(0n);
    });

    it("deploymentSummary() returns (0, 'pay-with-blip-v1')", async () => {
      const [nextId, version] = await registry.deploymentSummary();
      expect(nextId).to.equal(0n);
      expect(version).to.equal("pay-with-blip-v1");
    });
  });

  // ── createInvoice() ────────────────────────────────────────────────────────
  describe("createInvoice()", () => {
    it("creates an invoice and returns invoiceId 0", async () => {
      const tx = await registry.createInvoice(merchant.address, ONE_QUAI, "order-001");
      const receipt = await tx.wait();
      // Check the return value via a static call
      const id = await registry.createInvoice.staticCall(merchant.address, ONE_QUAI, "order-x");
      expect(id).to.equal(1n); // second call would be id=1
    });

    it("emits InvoiceCreated with correct parameters", async () => {
      await expect(
        registry.createInvoice(merchant.address, ONE_QUAI, "order-001")
      )
        .to.emit(registry, "InvoiceCreated")
        .withArgs(0n, merchant.address, ONE_QUAI, "order-001");
    });

    it("increments nextInvoiceId after each creation", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-001");
      expect(await registry.nextInvoiceId()).to.equal(1n);
      await registry.createInvoice(merchant.address, HALF_QUAI, "order-002");
      expect(await registry.nextInvoiceId()).to.equal(2n);
    });

    it("assigns sequential IDs to multiple invoices", async () => {
      for (let i = 0; i < 5; i++) {
        const id = await registry.createInvoice.staticCall(
          merchant.address, ONE_QUAI, `order-${i}`
        );
        expect(id).to.equal(BigInt(i));
        await registry.createInvoice(merchant.address, ONE_QUAI, `order-${i}`);
      }
    });

    it("stores invoice data correctly", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "ref-abc");
      const inv = await registry.getInvoice(0n);

      expect(inv.merchant).to.equal(merchant.address);
      expect(inv.payer).to.equal(ethers.ZeroAddress);
      expect(inv.amount).to.equal(ONE_QUAI);
      expect(inv.orderRef).to.equal("ref-abc");
      expect(inv.status).to.equal(Status.Pending);
      expect(inv.createdAt).to.be.gt(0n);
      expect(inv.confirmedAt).to.equal(0n);
    });

    it("two invoices store independent data", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-A");
      await registry.createInvoice(stranger.address, HALF_QUAI, "order-B");

      const invA = await registry.getInvoice(0n);
      const invB = await registry.getInvoice(1n);

      expect(invA.merchant).to.equal(merchant.address);
      expect(invA.amount).to.equal(ONE_QUAI);
      expect(invB.merchant).to.equal(stranger.address);
      expect(invB.amount).to.equal(HALF_QUAI);
    });

    it("reverts when merchant is zero address", async () => {
      await expect(
        registry.createInvoice(ethers.ZeroAddress, ONE_QUAI, "order-001")
      ).to.be.revertedWith("PaymentRegistry: merchant is zero address");
    });

    it("reverts when amount is 0", async () => {
      await expect(
        registry.createInvoice(merchant.address, 0n, "order-001")
      ).to.be.revertedWith("PaymentRegistry: amount must be > 0");
    });

    it("reverts when orderRef is empty string", async () => {
      await expect(
        registry.createInvoice(merchant.address, ONE_QUAI, "")
      ).to.be.revertedWith("PaymentRegistry: orderRef is empty");
    });

    it("allows any caller to create an invoice", async () => {
      // Not restricted — merchant, payer, or stranger can all create
      await expect(
        registry.connect(stranger).createInvoice(merchant.address, ONE_QUAI, "from-stranger")
      ).to.emit(registry, "InvoiceCreated");
    });

    it("deploymentSummary() nextId updates after creation", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-001");
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-002");
      const [nextId] = await registry.deploymentSummary();
      expect(nextId).to.equal(2n);
    });
  });

  // ── confirmPayment() ───────────────────────────────────────────────────────
  describe("confirmPayment()", () => {
    beforeEach(async () => {
      // Create a fresh pending invoice before each confirmPayment test
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-pay");
    });

    it("emits PaymentConfirmed with correct args", async () => {
      await expect(registry.confirmPayment(0n, payer.address))
        .to.emit(registry, "PaymentConfirmed")
        .withArgs(0n, payer.address, ONE_QUAI);
    });

    it("updates invoice status to Confirmed", async () => {
      await registry.confirmPayment(0n, payer.address);
      const inv = await registry.getInvoice(0n);
      expect(inv.status).to.equal(Status.Confirmed);
    });

    it("sets payer address on the invoice", async () => {
      await registry.confirmPayment(0n, payer.address);
      const inv = await registry.getInvoice(0n);
      expect(inv.payer).to.equal(payer.address);
    });

    it("sets confirmedAt to a non-zero timestamp", async () => {
      await registry.confirmPayment(0n, payer.address);
      const inv = await registry.getInvoice(0n);
      expect(inv.confirmedAt).to.be.gt(0n);
    });

    it("confirmedAt is >= createdAt", async () => {
      await registry.confirmPayment(0n, payer.address);
      const inv = await registry.getInvoice(0n);
      expect(inv.confirmedAt).to.be.gte(inv.createdAt);
    });

    it("preserves all other invoice fields after confirmation", async () => {
      await registry.confirmPayment(0n, payer.address);
      const inv = await registry.getInvoice(0n);
      expect(inv.merchant).to.equal(merchant.address);
      expect(inv.amount).to.equal(ONE_QUAI);
      expect(inv.orderRef).to.equal("order-pay");
    });

    it("allows any caller to confirm (open access, hackathon scope)", async () => {
      await expect(
        registry.connect(stranger).confirmPayment(0n, payer.address)
      ).to.emit(registry, "PaymentConfirmed");
    });

    it("reverts when payer is zero address", async () => {
      await expect(
        registry.confirmPayment(0n, ethers.ZeroAddress)
      ).to.be.revertedWith("PaymentRegistry: payer is zero address");
    });

    it("reverts when invoice does not exist", async () => {
      await expect(
        registry.confirmPayment(999n, payer.address)
      ).to.be.revertedWith("PaymentRegistry: invoice does not exist");
    });

    it("reverts double confirmation (already Confirmed)", async () => {
      await registry.confirmPayment(0n, payer.address);
      await expect(
        registry.confirmPayment(0n, payer.address)
      ).to.be.revertedWith("PaymentRegistry: invoice not pending");
    });

    it("reverts confirming a Cancelled invoice", async () => {
      await registry.cancelInvoice(0n);
      await expect(
        registry.confirmPayment(0n, payer.address)
      ).to.be.revertedWith("PaymentRegistry: invoice not pending");
    });

    it("confirms multiple independent invoices correctly", async () => {
      await registry.createInvoice(merchant.address, HALF_QUAI, "order-002");

      await registry.confirmPayment(0n, payer.address);
      await registry.confirmPayment(1n, stranger.address);

      expect((await registry.getInvoice(0n)).payer).to.equal(payer.address);
      expect((await registry.getInvoice(1n)).payer).to.equal(stranger.address);
      expect((await registry.getInvoice(0n)).status).to.equal(Status.Confirmed);
      expect((await registry.getInvoice(1n)).status).to.equal(Status.Confirmed);
    });
  });

  // ── cancelInvoice() ────────────────────────────────────────────────────────
  describe("cancelInvoice()", () => {
    beforeEach(async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-cancel");
    });

    it("emits InvoiceCancelled with correct invoiceId", async () => {
      await expect(registry.cancelInvoice(0n))
        .to.emit(registry, "InvoiceCancelled")
        .withArgs(0n);
    });

    it("updates invoice status to Cancelled", async () => {
      await registry.cancelInvoice(0n);
      const inv = await registry.getInvoice(0n);
      expect(inv.status).to.equal(Status.Cancelled);
    });

    it("leaves payer as zero address after cancel", async () => {
      await registry.cancelInvoice(0n);
      const inv = await registry.getInvoice(0n);
      expect(inv.payer).to.equal(ethers.ZeroAddress);
    });

    it("allows any caller to cancel (open access, hackathon scope)", async () => {
      await expect(
        registry.connect(stranger).cancelInvoice(0n)
      ).to.emit(registry, "InvoiceCancelled");
    });

    it("reverts when invoice does not exist", async () => {
      await expect(
        registry.cancelInvoice(999n)
      ).to.be.revertedWith("PaymentRegistry: invoice does not exist");
    });

    it("reverts double cancel (already Cancelled)", async () => {
      await registry.cancelInvoice(0n);
      await expect(
        registry.cancelInvoice(0n)
      ).to.be.revertedWith("PaymentRegistry: invoice not pending");
    });

    it("reverts cancelling a Confirmed invoice", async () => {
      await registry.confirmPayment(0n, payer.address);
      await expect(
        registry.cancelInvoice(0n)
      ).to.be.revertedWith("PaymentRegistry: invoice not pending");
    });
  });

  // ── getInvoice() ───────────────────────────────────────────────────────────
  describe("getInvoice()", () => {
    it("returns the correct struct for an existing invoice", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "ref-xyz");
      const inv = await registry.getInvoice(0n);

      expect(inv.merchant).to.equal(merchant.address);
      expect(inv.amount).to.equal(ONE_QUAI);
      expect(inv.orderRef).to.equal("ref-xyz");
      expect(inv.status).to.equal(Status.Pending);
    });

    it("reverts for a non-existent invoice ID", async () => {
      await expect(
        registry.getInvoice(0n)
      ).to.be.revertedWith("PaymentRegistry: invoice does not exist");
    });

    it("reverts for a very large non-existent ID", async () => {
      await expect(
        registry.getInvoice(9999n)
      ).to.be.revertedWith("PaymentRegistry: invoice does not exist");
    });
  });

  // ── getStatus() ────────────────────────────────────────────────────────────
  describe("getStatus()", () => {
    beforeEach(async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "order-status");
    });

    it("returns Pending (0) for a new invoice", async () => {
      expect(await registry.getStatus(0n)).to.equal(Status.Pending);
    });

    it("returns Confirmed (1) after confirmPayment()", async () => {
      await registry.confirmPayment(0n, payer.address);
      expect(await registry.getStatus(0n)).to.equal(Status.Confirmed);
    });

    it("returns Cancelled (2) after cancelInvoice()", async () => {
      await registry.cancelInvoice(0n);
      expect(await registry.getStatus(0n)).to.equal(Status.Cancelled);
    });

    it("reverts for a non-existent invoice ID", async () => {
      await expect(
        registry.getStatus(999n)
      ).to.be.revertedWith("PaymentRegistry: invoice does not exist");
    });
  });

  // ── Edge cases / cross-function ordering ────────────────────────────────────
  describe("edge cases", () => {
    it("fresh contract: getInvoice(0) reverts (nothing created yet)", async () => {
      await expect(registry.getInvoice(0n))
        .to.be.revertedWith("PaymentRegistry: invoice does not exist");
    });

    it("first invoice after multiple creates always has correct ID", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "A");
      await registry.createInvoice(merchant.address, ONE_QUAI, "B");
      await registry.createInvoice(merchant.address, ONE_QUAI, "C");

      expect((await registry.getInvoice(0n)).orderRef).to.equal("A");
      expect((await registry.getInvoice(1n)).orderRef).to.equal("B");
      expect((await registry.getInvoice(2n)).orderRef).to.equal("C");
    });

    it("confirming invoice 1 does not affect invoice 0 state", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "A");
      await registry.createInvoice(merchant.address, ONE_QUAI, "B");
      await registry.confirmPayment(1n, payer.address);

      expect((await registry.getInvoice(0n)).status).to.equal(Status.Pending);
      expect((await registry.getInvoice(1n)).status).to.equal(Status.Confirmed);
    });

    it("cancelling invoice 0 does not affect invoice 1 state", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "A");
      await registry.createInvoice(merchant.address, ONE_QUAI, "B");
      await registry.cancelInvoice(0n);

      expect((await registry.getInvoice(0n)).status).to.equal(Status.Cancelled);
      expect((await registry.getInvoice(1n)).status).to.equal(Status.Pending);
    });

    it("full happy path: create → confirm → read-back reflects final state", async () => {
      // create
      await registry.createInvoice(merchant.address, ONE_QUAI, "full-flow");
      // confirm
      await registry.confirmPayment(0n, payer.address);
      // read-back
      const inv = await registry.getInvoice(0n);
      expect(inv.status).to.equal(Status.Confirmed);
      expect(inv.payer).to.equal(payer.address);
      expect(inv.confirmedAt).to.be.gt(0n);
    });

    it("full cancel path: create → cancel → read-back reflects final state", async () => {
      await registry.createInvoice(merchant.address, ONE_QUAI, "cancel-flow");
      await registry.cancelInvoice(0n);
      const inv = await registry.getInvoice(0n);
      expect(inv.status).to.equal(Status.Cancelled);
      expect(inv.payer).to.equal(ethers.ZeroAddress);
      expect(inv.confirmedAt).to.equal(0n);
    });

    it("high-volume: 20 invoices all created and independently confirmed", async () => {
      const COUNT = 20;
      for (let i = 0; i < COUNT; i++) {
        await registry.createInvoice(merchant.address, ONE_QUAI, `order-${i}`);
      }
      for (let i = 0; i < COUNT; i++) {
        await registry.confirmPayment(BigInt(i), payer.address);
      }
      for (let i = 0; i < COUNT; i++) {
        const inv = await registry.getInvoice(BigInt(i));
        expect(inv.status).to.equal(Status.Confirmed);
      }
      const [nextId] = await registry.deploymentSummary();
      expect(nextId).to.equal(BigInt(COUNT));
    });
  });
});
