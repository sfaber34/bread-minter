import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers";

describe("BuidlGuidlBread Contract", function () {
  // Fixture for deploying the contract
  async function deployBuidlGuidlBreadFixture() {
    const [owner, rpcBreadMinter, user1, user2, user3, unauthorized] = await ethers.getSigners();

    const BuidlGuidlBreadFactory = await ethers.getContractFactory("BuidlGuidlBread");
    const buidlGuidlBread = await BuidlGuidlBreadFactory.deploy(rpcBreadMinter.address);

    return {
      buidlGuidlBread,
      owner,
      rpcBreadMinter,
      user1,
      user2,
      user3,
      unauthorized,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      const { buidlGuidlBread, owner, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.name()).to.equal("Buidl Guidl Bread");
      expect(await buidlGuidlBread.symbol()).to.equal("BGBRD");
      expect(await buidlGuidlBread.decimals()).to.equal(18);
      expect(await buidlGuidlBread.owner()).to.equal(owner.address);
      expect(await buidlGuidlBread.rpcBreadMinterAddress()).to.equal(rpcBreadMinter.address);
      expect(await buidlGuidlBread.mintLimit()).to.equal(parseEther("168"));
      expect(await buidlGuidlBread.mintCooldown()).to.equal(86400); // 24 hours
    });

    it("Should mint 100,000 tokens to the deployer", async function () {
      const { buidlGuidlBread, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.balanceOf(owner.address)).to.equal(parseEther("100000"));
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("100000"));
    });

    it("Should set the RPC Bread Minter address correctly", async function () {
      const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.rpcBreadMinterAddress()).to.equal(rpcBreadMinter.address);
    });
  });

  describe("Owner Functions", function () {
    describe("setRpcBreadMinterAddress", function () {
      it("Should allow owner to update RPC Bread Minter address", async function () {
        const { buidlGuidlBread, owner, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(owner).setRpcBreadMinterAddress(user1.address);
        expect(await buidlGuidlBread.rpcBreadMinterAddress()).to.equal(user1.address);
      });

      it("Should reject non-owner attempts to update RPC Bread Minter address", async function () {
        const { buidlGuidlBread, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(
          buidlGuidlBread.connect(user1).setRpcBreadMinterAddress(user2.address),
        ).to.be.revertedWithCustomError(buidlGuidlBread, "OwnableUnauthorizedAccount");
      });
    });

    describe("setMintLimit", function () {
      it("Should allow owner to update mint limit", async function () {
        const { buidlGuidlBread, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

        const newLimit = parseEther("200");
        await expect(buidlGuidlBread.connect(owner).setMintLimit(newLimit))
          .to.emit(buidlGuidlBread, "MintLimitUpdated")
          .withArgs(newLimit);

        expect(await buidlGuidlBread.mintLimit()).to.equal(newLimit);
      });

      it("Should reject zero mint limit", async function () {
        const { buidlGuidlBread, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(owner).setMintLimit(0)).to.be.revertedWith(
          "Mint limit must be greater than 0",
        );
      });

      it("Should reject non-owner attempts to update mint limit", async function () {
        const { buidlGuidlBread, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(user1).setMintLimit(parseEther("200"))).to.be.revertedWithCustomError(
          buidlGuidlBread,
          "OwnableUnauthorizedAccount",
        );
      });
    });

    describe("setMintCooldown", function () {
      it("Should allow owner to update mint cooldown", async function () {
        const { buidlGuidlBread, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

        const newCooldown = 1200; // 20 minutes
        await expect(buidlGuidlBread.connect(owner).setMintCooldown(newCooldown))
          .to.emit(buidlGuidlBread, "CooldownUpdated")
          .withArgs(newCooldown);

        expect(await buidlGuidlBread.mintCooldown()).to.equal(newCooldown);
      });

      it("Should reject zero cooldown", async function () {
        const { buidlGuidlBread, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(owner).setMintCooldown(0)).to.be.revertedWith(
          "Cooldown must be greater than 0",
        );
      });

      it("Should reject non-owner attempts to update cooldown", async function () {
        const { buidlGuidlBread, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(user1).setMintCooldown(1200)).to.be.revertedWithCustomError(
          buidlGuidlBread,
          "OwnableUnauthorizedAccount",
        );
      });
    });
  });

  describe("Rate Limiting Functions", function () {
    describe("getRemainingCooldown", function () {
      it("Should return 0 for users who have never minted", async function () {
        const { buidlGuidlBread, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.getRemainingCooldown(user1.address)).to.equal(0);
      });

      it("Should return correct cooldown after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        const remainingCooldown = await buidlGuidlBread.getRemainingCooldown(user1.address);
        expect(remainingCooldown).to.be.greaterThan(0);
        expect(remainingCooldown).to.be.lessThanOrEqual(86400);
      });

      it("Should return 0 after cooldown period expires", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Fast forward past cooldown period
        await time.increase(86401);

        expect(await buidlGuidlBread.getRemainingCooldown(user1.address)).to.equal(0);
      });
    });

    describe("getMintedInPeriod", function () {
      it("Should return 0 for users who have never minted", async function () {
        const { buidlGuidlBread, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.getMintedInPeriod(user1.address)).to.equal(0);
      });

      it("Should return correct amount after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        const amount = parseEther("50");
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [amount]);

        expect(await buidlGuidlBread.getMintedInPeriod(user1.address)).to.equal(amount);
      });

      it("Should return 0 after cooldown period expires", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Fast forward past cooldown period
        await time.increase(86401);

        expect(await buidlGuidlBread.getMintedInPeriod(user1.address)).to.equal(0);
      });

      it("Should accumulate multiple mints in the same period", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("30")]);
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("20")]);

        expect(await buidlGuidlBread.getMintedInPeriod(user1.address)).to.equal(parseEther("50"));
      });
    });

    describe("getRemainingMintAmount", function () {
      it("Should return full mint limit for users who have never minted", async function () {
        const { buidlGuidlBread, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.getRemainingMintAmount(user1.address)).to.equal(parseEther("168"));
      });

      it("Should return correct remaining amount after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("30")]);

        expect(await buidlGuidlBread.getRemainingMintAmount(user1.address)).to.equal(parseEther("138"));
      });

      it("Should return 0 when mint limit is reached", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("168")]);

        expect(await buidlGuidlBread.getRemainingMintAmount(user1.address)).to.equal(0);
      });

      it("Should return full limit after cooldown period expires", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Fast forward past cooldown period
        await time.increase(86401);

        expect(await buidlGuidlBread.getRemainingMintAmount(user1.address)).to.equal(parseEther("168"));
      });
    });
  });

  describe("Batch Minting", function () {
    describe("batchMint", function () {
      it("Should mint tokens to single address", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        const amount = parseEther("50");
        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [amount]))
          .to.emit(buidlGuidlBread, "Mint")
          .withArgs(user1.address, amount);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(amount);
      });

      it("Should mint tokens to multiple addresses", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2, user3 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        const addresses = [user1.address, user2.address, user3.address];
        const amounts = [parseEther("30"), parseEther("40"), parseEther("50")];

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(amounts[0]);
        expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(amounts[1]);
        expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(amounts[2]);
      });

      it("Should enforce rate limiting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("150")]),
        ).to.be.revertedWith("Mint amount exceeds limit");
      });

      it("Should allow minting up to the limit", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("84")]);
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("84")]);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("168"));
      });

      it("Should reset rate limit after cooldown", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("168")]);

        // Fast forward past cooldown period
        await time.increase(86401);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("218"));
      });

      it("Should reject if not called by RPC Bread Minter", async function () {
        const { buidlGuidlBread, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(user1).batchMint([user2.address], [parseEther("50")])).to.be.revertedWith(
          "Only RPC Bread Minter can call this function",
        );
      });

      it("Should reject mismatched array lengths", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address, user2.address], [parseEther("50")]),
        ).to.be.revertedWith("Address and amount arrays must be the same length");
      });

      it("Should reject empty arrays", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint([], [])).to.be.revertedWith(
          "Arrays cannot be empty",
        );
      });

      it("Should reject zero address", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([ethers.ZeroAddress], [parseEther("50")]),
        ).to.be.revertedWith("Cannot mint to zero address");
      });

      it("Should reject zero amount", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [0])).to.be.revertedWith(
          "Amount must be greater than 0",
        );
      });

      it("Should reject batch size over 100", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        const addresses = Array(101).fill(ethers.Wallet.createRandom().address);
        const amounts = Array(101).fill(parseEther("1"));

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts)).to.be.revertedWith(
          "Maximum batch size is 100",
        );
      });
    });
  });

  describe("Batch Burning", function () {
    describe("batchBurn", function () {
      it("Should burn tokens from single address", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        // First mint some tokens
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("168")]);

        const burnAmount = parseEther("30");
        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchBurn([user1.address], [burnAmount]))
          .to.emit(buidlGuidlBread, "PenaltyBurn")
          .withArgs(user1.address, burnAmount);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("138"));
      });

      it("Should burn tokens from multiple addresses", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2, user3 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // First mint some tokens
        const addresses = [user1.address, user2.address, user3.address];
        const mintAmounts = [parseEther("168"), parseEther("168"), parseEther("168")];
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, mintAmounts);

        // Reset cooldown to allow more minting
        await time.increase(86401);

        const burnAmounts = [parseEther("20"), parseEther("30"), parseEther("40")];
        await buidlGuidlBread.connect(rpcBreadMinter).batchBurn(addresses, burnAmounts);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("148"));
        expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("138"));
        expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(parseEther("128"));
      });

      it("Should reject if not called by RPC Bread Minter", async function () {
        const { buidlGuidlBread, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(user1).batchBurn([user2.address], [parseEther("50")])).to.be.revertedWith(
          "Only RPC Bread Minter can call this function",
        );
      });

      it("Should reject mismatched array lengths", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchBurn([user1.address, user2.address], [parseEther("50")]),
        ).to.be.revertedWith("Address and amount arrays must be the same length");
      });

      it("Should reject empty arrays", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchBurn([], [])).to.be.revertedWith(
          "Arrays cannot be empty",
        );
      });

      it("Should reject zero address", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchBurn([ethers.ZeroAddress], [parseEther("50")]),
        ).to.be.revertedWith("Cannot burn from zero address");
      });

      it("Should reject zero amount", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchBurn([user1.address], [0])).to.be.revertedWith(
          "Amount must be greater than 0",
        );
      });

      it("Should reject batch size over 100", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        const addresses = Array(101).fill(ethers.Wallet.createRandom().address);
        const amounts = Array(101).fill(parseEther("1"));

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchBurn(addresses, amounts)).to.be.revertedWith(
          "Maximum batch size is 100",
        );
      });

      it("Should handle insufficient balance error", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        // Try to burn more than balance (user1 has 0 balance)
        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchBurn([user1.address], [parseEther("168")]),
        ).to.be.revertedWithCustomError(buidlGuidlBread, "ERC20InsufficientBalance");
      });
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complex minting and burning scenario", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1, user2, user3 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Initial state check
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("100000"));

      // Mint to multiple users
      const addresses = [user1.address, user2.address, user3.address];
      const amounts = [parseEther("30"), parseEther("40"), parseEther("50")];
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts);

      // Check balances
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("30"));
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("40"));
      expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(parseEther("50"));

      // Total supply should increase
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("100120"));

      // Burn some tokens
      const burnAmounts = [parseEther("10"), parseEther("15"), parseEther("20")];
      await buidlGuidlBread.connect(rpcBreadMinter).batchBurn(addresses, burnAmounts);

      // Check final balances
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("20"));
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("25"));
      expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(parseEther("30"));

      // Total supply should decrease
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("100075"));
    });

    it("Should respect rate limits across multiple transactions", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Mint up to limit in multiple transactions
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("84")]);
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("42")]);
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("42")]);

      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("168"));

      // Should reject trying to mint more
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("1")]),
      ).to.be.revertedWith("Mint amount exceeds limit");

      // After cooldown, should be able to mint again
      await time.increase(86401);

      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("218"));
    });

    it("Should handle owner functions correctly", async function () {
      const { buidlGuidlBread, owner, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Update mint limit
      await buidlGuidlBread.connect(owner).setMintLimit(parseEther("200"));
      expect(await buidlGuidlBread.mintLimit()).to.equal(parseEther("200"));

      // Update cooldown
      await buidlGuidlBread.connect(owner).setMintCooldown(1200);
      expect(await buidlGuidlBread.mintCooldown()).to.equal(1200);

      // Update RPC minter address
      await buidlGuidlBread.connect(owner).setRpcBreadMinterAddress(user1.address);
      expect(await buidlGuidlBread.rpcBreadMinterAddress()).to.equal(user1.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum batch size correctly", async function () {
      const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Create arrays of exactly 100 items
      const addresses = Array(100)
        .fill(0)
        .map(() => ethers.Wallet.createRandom().address);
      const amounts = Array(100).fill(parseEther("1"));

      // Should succeed with exactly 100 items
      await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts)).to.not.be.reverted;
    });

    it("Should handle rate limit boundary conditions", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Mint exactly the limit
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("168")]);

      // Check remaining amount is 0
      expect(await buidlGuidlBread.getRemainingMintAmount(user1.address)).to.equal(0);

      // Fast forward to just before cooldown expires
      await time.increase(86399);

      // Should still be in cooldown (1 second remaining)
      expect(await buidlGuidlBread.getRemainingCooldown(user1.address)).to.equal(1);

      // Fast forward past cooldown
      await time.increase(1);

      // Now should be able to mint again (cooldown is over)
      expect(await buidlGuidlBread.getRemainingCooldown(user1.address)).to.equal(0);
      expect(await buidlGuidlBread.getRemainingMintAmount(user1.address)).to.equal(parseEther("168"));
    });
  });
});
