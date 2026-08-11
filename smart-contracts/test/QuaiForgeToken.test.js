// QuaiForge — Test Suite: QuaiForgeToken (token-v1)
// Run: npx hardhat test test/QuaiForgeToken.test.js --network localhost

const { expect } = require("chai");
const { ethers }  = require("hardhat");

const DECIMALS   = 18n;
const ONE_TOKEN  = 10n ** DECIMALS;
const NAME       = "CommunityCoin";
const SYMBOL     = "CMC";
const SUPPLY     = 1_000_000n; // whole tokens

describe("QuaiForgeToken", function () {
  let owner, alice, bob, token;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("QuaiForgeToken");
    token = await F.deploy(NAME, SYMBOL, SUPPLY, owner.address);
    await token.waitForDeployment();
  });

  // ── Constructor validation ──────────────────────────────────────────────
  describe("constructor — parameter validation", () => {
    it("reverts when name is empty", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      await expect(F.deploy("", SYMBOL, SUPPLY, owner.address))
        .to.be.revertedWith("QuaiForgeToken: name is empty");
    });

    it("reverts when symbol is empty", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      await expect(F.deploy(NAME, "", SUPPLY, owner.address))
        .to.be.revertedWith("QuaiForgeToken: symbol is empty");
    });

    it("reverts when symbol exceeds 11 characters", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      await expect(F.deploy(NAME, "TOOLONGSYMBL", SUPPLY, owner.address))
        .to.be.revertedWith("QuaiForgeToken: symbol exceeds 11 chars");
    });

    it("accepts symbol of exactly 11 characters", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      const t = await F.deploy(NAME, "EXACTLY11CH", SUPPLY, owner.address);
      await t.waitForDeployment();
      expect(await t.symbol()).to.equal("EXACTLY11CH");
    });

    it("reverts when initialSupply is zero", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      await expect(F.deploy(NAME, SYMBOL, 0n, owner.address))
        .to.be.revertedWith("QuaiForgeToken: supply must be > 0");
    });

    it("reverts when owner is zero address", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      await expect(F.deploy(NAME, SYMBOL, SUPPLY, ethers.ZeroAddress))
        .to.be.revertedWith("QuaiForgeToken: owner is zero address");
    });

    it("deploys successfully with valid parameters", async () => {
      expect(await token.getAddress()).to.be.properAddress;
    });
  });

  // ── ERC-20 standard properties ──────────────────────────────────────────
  describe("ERC-20 standard properties", () => {
    it("returns the correct name", async () => {
      expect(await token.name()).to.equal(NAME);
    });

    it("returns the correct symbol", async () => {
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("returns 18 decimals", async () => {
      expect(await token.decimals()).to.equal(18n);
    });

    it("returns correct total supply in wei", async () => {
      expect(await token.totalSupply()).to.equal(SUPPLY * ONE_TOKEN);
    });
  });

  // ── Initial supply distribution ─────────────────────────────────────────
  describe("initial supply distribution", () => {
    it("mints entire supply to the specified owner", async () => {
      expect(await token.balanceOf(owner.address)).to.equal(SUPPLY * ONE_TOKEN);
    });

    it("non-owner starts with zero balance", async () => {
      expect(await token.balanceOf(alice.address)).to.equal(0n);
    });

    it("can deploy with a different owner than deployer", async () => {
      const F = await ethers.getContractFactory("QuaiForgeToken");
      const t = await F.deploy(NAME, SYMBOL, 100n, alice.address);
      await t.waitForDeployment();
      expect(await t.balanceOf(alice.address)).to.equal(100n * ONE_TOKEN);
      expect(await t.owner()).to.equal(alice.address);
    });
  });

  // ── Transfer ────────────────────────────────────────────────────────────
  describe("transfer", () => {
    it("transfers tokens and emits Transfer event", async () => {
      const amount = 500n * ONE_TOKEN;
      await expect(token.connect(owner).transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("reverts when sender has insufficient balance", async () => {
      await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.reverted;
    });

    it("reverts on transfer to zero address", async () => {
      await expect(token.connect(owner).transfer(ethers.ZeroAddress, 1n)).to.be.reverted;
    });
  });

  // ── Approve + transferFrom ───────────────────────────────────────────────
  describe("approve and transferFrom", () => {
    it("sets allowance correctly", async () => {
      const amount = 100n * ONE_TOKEN;
      await token.connect(owner).approve(alice.address, amount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(amount);
    });

    it("alice can spend approved tokens", async () => {
      const amount = 200n * ONE_TOKEN;
      await token.connect(owner).approve(alice.address, amount);
      await expect(token.connect(alice).transferFrom(owner.address, bob.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, bob.address, amount);
      expect(await token.balanceOf(bob.address)).to.equal(amount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(0n);
    });

    it("reverts when spending more than allowance", async () => {
      await token.connect(owner).approve(alice.address, 50n * ONE_TOKEN);
      await expect(
        token.connect(alice).transferFrom(owner.address, bob.address, 51n * ONE_TOKEN)
      ).to.be.reverted;
    });
  });

  // ── Ownership ────────────────────────────────────────────────────────────
  describe("ownership", () => {
    it("sets correct owner at deployment", async () => {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("transfers ownership and emits event", async () => {
      await expect(token.connect(owner).transferOwnership(alice.address))
        .to.emit(token, "OwnershipTransferred")
        .withArgs(owner.address, alice.address);
      expect(await token.owner()).to.equal(alice.address);
    });

    it("reverts transferOwnership from non-owner", async () => {
      await expect(token.connect(alice).transferOwnership(bob.address)).to.be.reverted;
    });

    it("renounces ownership", async () => {
      await token.connect(owner).renounceOwnership();
      expect(await token.owner()).to.equal(ethers.ZeroAddress);
    });
  });

  // ── Fixed supply (no post-deploy mint) ───────────────────────────────────
  describe("fixed supply — no post-deploy minting", () => {
    it("does not expose a public mint function", async () => {
      // Check ABI fragments — OZ ERC20 has internal _mint() only, not public.
      const hasMint = token.interface.fragments.some(
        (f) => f.type === "function" && f.name === "mint"
      );
      expect(hasMint).to.be.false;
    });

    it("total supply is unchanged after transfers", async () => {
      const before = await token.totalSupply();
      await token.connect(owner).transfer(alice.address, ONE_TOKEN);
      expect(await token.totalSupply()).to.equal(before);
    });
  });

  // ── TEMPLATE_VERSION ────────────────────────────────────────────────────
  describe("TEMPLATE_VERSION", () => {
    it("returns 'token-v1'", async () => {
      expect(await token.TEMPLATE_VERSION()).to.equal("token-v1");
    });
  });

  // ── deploymentSummary() read-back (§6.3) ─────────────────────────────────
  describe("deploymentSummary()", () => {
    it("returns all expected values in a single call", async () => {
      const [rName, rSymbol, rTotalSupply, rOwner, rVersion, rDecimals] =
        await token.deploymentSummary();
      expect(rName).to.equal(NAME);
      expect(rSymbol).to.equal(SYMBOL);
      expect(rTotalSupply).to.equal(SUPPLY * ONE_TOKEN);
      expect(rOwner).to.equal(owner.address);
      expect(rVersion).to.equal("token-v1");
      expect(rDecimals).to.equal(18n);
    });
  });
});
