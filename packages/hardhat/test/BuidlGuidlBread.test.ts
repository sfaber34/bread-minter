import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers";

describe("BuidlGuidlBread Contract", function () {
  // Fixture for deploying the contract
  async function deployBuidlGuidlBreadFixture() {
    const [owner, rpcBreadMinter, pauseAddress, user1, user2, user3, unauthorized] = await ethers.getSigners();

    const BuidlGuidlBreadFactory = await ethers.getContractFactory("BuidlGuidlBread");
    const buidlGuidlBread = await BuidlGuidlBreadFactory.deploy(rpcBreadMinter.address, pauseAddress.address);

    return {
      buidlGuidlBread,
      owner,
      rpcBreadMinter,
      pauseAddress,
      user1,
      user2,
      user3,
      unauthorized,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      const { buidlGuidlBread, owner, rpcBreadMinter, pauseAddress } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.name()).to.equal("BuidlGuidl Bread");
      expect(await buidlGuidlBread.symbol()).to.equal("BGBRD");
      expect(await buidlGuidlBread.decimals()).to.equal(18);
      expect(await buidlGuidlBread.owner()).to.equal(owner.address);
      expect(await buidlGuidlBread.rpcBreadMinterAddress()).to.equal(rpcBreadMinter.address);
      expect(await buidlGuidlBread.pauseAddress()).to.equal(pauseAddress.address);
      expect(await buidlGuidlBread.mintLimit()).to.equal(parseEther("168"));
      expect(await buidlGuidlBread.mintCooldown()).to.equal(86400); // 24 hours
      expect(await buidlGuidlBread.pauseEndTime()).to.equal(0);
    });

    it("Should mint 1,000,000 tokens to the deployer", async function () {
      const { buidlGuidlBread, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.balanceOf(owner.address)).to.equal(parseEther("1000000"));
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("1000000"));
    });

    it("Should set the RPC Bread Minter address correctly", async function () {
      const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.rpcBreadMinterAddress()).to.equal(rpcBreadMinter.address);
    });

    it("Should set the pause address correctly", async function () {
      const { buidlGuidlBread, pauseAddress } = await loadFixture(deployBuidlGuidlBreadFixture);

      expect(await buidlGuidlBread.pauseAddress()).to.equal(pauseAddress.address);
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

    describe("setPauseAddress", function () {
      it("Should allow owner to update pause address", async function () {
        const { buidlGuidlBread, owner, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(owner).setPauseAddress(user1.address);
        expect(await buidlGuidlBread.pauseAddress()).to.equal(user1.address);
      });

      it("Should reject non-owner attempts to update pause address", async function () {
        const { buidlGuidlBread, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(user1).setPauseAddress(user2.address)).to.be.revertedWithCustomError(
          buidlGuidlBread,
          "OwnableUnauthorizedAccount",
        );
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

  describe("Pause Functionality", function () {
    describe("pauseMinting", function () {
      it("Should allow pause address to pause minting for 24 hours", async function () {
        const { buidlGuidlBread, pauseAddress } = await loadFixture(deployBuidlGuidlBreadFixture);

        const currentTime = await time.latest();
        await expect(buidlGuidlBread.connect(pauseAddress).pauseMinting())
          .to.emit(buidlGuidlBread, "MintingPaused")
          .withArgs(currentTime + 1 + 86400); // +1 for block time increment

        const pauseEndTime = await buidlGuidlBread.pauseEndTime();
        expect(pauseEndTime).to.be.greaterThan(currentTime + 86300); // Should be around 24 hours from now
        expect(pauseEndTime).to.be.lessThan(currentTime + 86500); // Allow some buffer for block timing
      });

      it("Should reject non-pause address attempts to pause minting", async function () {
        const { buidlGuidlBread, owner, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(owner).pauseMinting()).to.be.revertedWith(
          "Only pause address can call this function",
        );

        await expect(buidlGuidlBread.connect(rpcBreadMinter).pauseMinting()).to.be.revertedWith(
          "Only pause address can call this function",
        );

        await expect(buidlGuidlBread.connect(user1).pauseMinting()).to.be.revertedWith(
          "Only pause address can call this function",
        );
      });

      it("Should block minting when paused", async function () {
        const { buidlGuidlBread, pauseAddress, rpcBreadMinter, user1 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // Pause minting
        await buidlGuidlBread.connect(pauseAddress).pauseMinting();

        // Try to mint - should fail
        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]),
        ).to.be.revertedWith("Minting is currently paused");
      });

      it("Should allow minting again after pause expires", async function () {
        const { buidlGuidlBread, pauseAddress, rpcBreadMinter, user1 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // Pause minting
        await buidlGuidlBread.connect(pauseAddress).pauseMinting();

        // Fast forward past pause period (24 hours + 1 second)
        await time.increase(86401);

        // Should be able to mint again
        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]))
          .to.emit(buidlGuidlBread, "Mint")
          .withArgs(user1.address, parseEther("50"));

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("50"));
      });

      it("Should allow multiple pauses", async function () {
        const { buidlGuidlBread, pauseAddress, rpcBreadMinter, user1 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // First pause
        await buidlGuidlBread.connect(pauseAddress).pauseMinting();
        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]),
        ).to.be.revertedWith("Minting is currently paused");

        // Wait for pause to expire
        await time.increase(86401);

        // Should be able to mint
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Pause again
        await buidlGuidlBread.connect(pauseAddress).pauseMinting();
        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]),
        ).to.be.revertedWith("Minting is currently paused");
      });

      it("Should not block minting when pauseEndTime is 0", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        // Verify pauseEndTime is 0 initially
        expect(await buidlGuidlBread.pauseEndTime()).to.equal(0);

        // Should be able to mint normally
        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]))
          .to.emit(buidlGuidlBread, "Mint")
          .withArgs(user1.address, parseEther("50"));
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

  describe("Integration Tests", function () {
    it("Should handle complex minting scenario with pause", async function () {
      const { buidlGuidlBread, rpcBreadMinter, pauseAddress, user1, user2, user3 } =
        await loadFixture(deployBuidlGuidlBreadFixture);

      // Initial state check
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("1000000"));

      // Mint to multiple users
      const addresses = [user1.address, user2.address, user3.address];
      const amounts = [parseEther("30"), parseEther("40"), parseEther("50")];
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts);

      // Check balances
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("30"));
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("40"));
      expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(parseEther("50"));

      // Total supply should increase
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("1000120"));

      // Pause minting
      await buidlGuidlBread.connect(pauseAddress).pauseMinting();

      // Try to mint more - should fail
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("10")]),
      ).to.be.revertedWith("Minting is currently paused");

      // Fast forward past pause
      await time.increase(86401);

      // Should be able to mint again
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("10")]);
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("40"));
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

      // Update pause address
      await buidlGuidlBread.connect(owner).setPauseAddress(user1.address);
      expect(await buidlGuidlBread.pauseAddress()).to.equal(user1.address);
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

    it("Should handle pause timing edge cases", async function () {
      const { buidlGuidlBread, pauseAddress, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Pause minting
      await buidlGuidlBread.connect(pauseAddress).pauseMinting();

      // Fast forward to just before pause expires (24 hours - 2 seconds to be safe)
      await time.increase(86398);

      // Should still be paused
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]),
      ).to.be.revertedWith("Minting is currently paused");

      // Fast forward past pause period (add 3 seconds to be well past)
      await time.increase(3);

      // Should be able to mint again
      await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]))
        .to.emit(buidlGuidlBread, "Mint")
        .withArgs(user1.address, parseEther("50"));
    });
  });
});
