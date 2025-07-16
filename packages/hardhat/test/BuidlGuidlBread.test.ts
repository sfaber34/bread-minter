import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers";

describe("BuidlGuidlBread Contract", function () {
  // Fixture for deploying the contract
  async function deployBuidlGuidlBreadFixture() {
    const [deployer, owner, rpcBreadMinter, pauseAddress, user1, user2, user3, unauthorized] =
      await ethers.getSigners();

    const BuidlGuidlBreadFactory = await ethers.getContractFactory("BuidlGuidlBread");
    const buidlGuidlBread = await BuidlGuidlBreadFactory.deploy(
      owner.address,
      rpcBreadMinter.address,
      pauseAddress.address,
    );

    return {
      buidlGuidlBread,
      deployer,
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
      expect(await buidlGuidlBread.mintLimit()).to.equal(parseEther("420"));
      expect(await buidlGuidlBread.mintCooldown()).to.equal(82800); // 23 hours
      expect(await buidlGuidlBread.pauseEndTime()).to.equal(0);
      expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(false);
    });

    it("Should mint 1,000,000 tokens to the initial owner", async function () {
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

        const newLimit = parseEther("500");
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

        await expect(buidlGuidlBread.connect(user1).setMintLimit(parseEther("500"))).to.be.revertedWithCustomError(
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

  describe("Global Rate Limiting Functions", function () {
    describe("getRemainingCooldown", function () {
      it("Should return 0 when no global minting has occurred", async function () {
        const { buidlGuidlBread } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.getRemainingCooldown()).to.equal(0);
      });

      it("Should return correct cooldown after period reset", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

        const remainingCooldown = await buidlGuidlBread.getRemainingCooldown();
        expect(remainingCooldown).to.be.greaterThan(0);
        expect(remainingCooldown).to.be.lessThanOrEqual(82800); // 23 hours
      });

      it("Should return 0 after cooldown period expires", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

        // Fast forward past cooldown period (23 hours + 1 second)
        await time.increase(82801);

        expect(await buidlGuidlBread.getRemainingCooldown()).to.equal(0);
      });
    });

    describe("getGlobalMintedInPeriod", function () {
      it("Should return 0 when no global minting has occurred", async function () {
        const { buidlGuidlBread } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(0);
      });

      it("Should return correct amount after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        const amount = parseEther("50");
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [amount]);

        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(amount);
      });

      it("Should return 0 after period is completed", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(parseEther("50"));

        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();
        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(0);
      });

      it("Should accumulate multiple mints in the same period", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("30")]);
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("20")]);

        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(parseEther("50"));
      });
    });

    describe("getRemainingMintAmount", function () {
      it("Should return full mint limit when no global minting has occurred", async function () {
        const { buidlGuidlBread } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(parseEther("420"));
      });

      it("Should return correct remaining amount after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("100")]);

        expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(parseEther("320"));
      });

      it("Should return 0 when global mint limit is reached", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("420")]);

        expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(0);
      });

      it("Should return full limit after period is completed", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);
        expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(parseEther("220"));

        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();
        expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(parseEther("420"));
      });
    });
  });

  describe("Period Management", function () {
    describe("completeMintingPeriod", function () {
      it("Should allow RPC minter to complete a period after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        const currentTime = await time.latest();
        await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod())
          .to.emit(buidlGuidlBread, "MintingPeriodCompleted")
          .withArgs(currentTime + 1); // +1 for block time increment

        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(0);
        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(false);
      });

      it("Should reject completing period without minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter } = await loadFixture(deployBuidlGuidlBreadFixture);

        await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.be.revertedWith(
          "No minting occurred this period",
        );
      });

      it("Should reject non-RPC minter attempts to complete period", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, owner } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        await expect(buidlGuidlBread.connect(owner).completeMintingPeriod()).to.be.revertedWith(
          "Only RPC Bread Minter can call this function",
        );

        await expect(buidlGuidlBread.connect(user1).completeMintingPeriod()).to.be.revertedWith(
          "Only RPC Bread Minter can call this function",
        );
      });

      it("Should reject completing period outside of reset window", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

        // Fast forward past the 2-hour reset window (23 hours + 2 hours + 1 second)
        await time.increase(82800 + 7200 + 1);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.be.revertedWith(
          "Reset window expired",
        );
      });

      it("Should allow completing period within reset window", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

        // Fast forward to just after cooldown expires (23 hours + 30 minutes)
        await time.increase(82800 + 1800);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Should be able to complete within the 2-hour window
        await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.emit(
          buidlGuidlBread,
          "MintingPeriodCompleted",
        );
      });

      it("Should reject completing period when minting is paused", async function () {
        const { buidlGuidlBread, rpcBreadMinter, pauseAddress, user1 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // Mint first
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Pause minting
        await buidlGuidlBread.connect(pauseAddress).pauseMinting();

        // Try to complete period while paused - should fail
        await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.be.revertedWith(
          "Period completion paused",
        );
      });

      it("Should allow completing period after pause expires", async function () {
        const { buidlGuidlBread, rpcBreadMinter, pauseAddress, user1 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // Mint first
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        // Pause minting
        await buidlGuidlBread.connect(pauseAddress).pauseMinting();

        // Fast forward past pause period (24 hours + 1 second)
        await time.increase(86401);

        // Should be able to complete period after pause expires
        await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.emit(
          buidlGuidlBread,
          "MintingPeriodCompleted",
        );
      });
    });

    describe("mintingOccurredThisPeriod tracking", function () {
      it("Should be false initially", async function () {
        const { buidlGuidlBread } = await loadFixture(deployBuidlGuidlBreadFixture);

        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(false);
      });

      it("Should be set to true after minting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);

        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(true);
      });

      it("Should be reset to false after completing period", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("50")]);
        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(true);

        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();
        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(false);
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
        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(true);
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
        expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(true);
      });

      it("Should enforce global rate limiting", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        // Mint 200 tokens to user1
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);

        // Try to mint 300 more tokens to user2 - should fail as total would be 500 > 420 limit
        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("300")]),
        ).to.be.revertedWith("Mint amount exceeds global limit");
      });

      it("Should allow minting up to the global limit", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);
        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("220")]);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("200"));
        expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("220"));
        expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(parseEther("420"));
      });

      it("Should allow minting after period completion", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("420")]);
        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

        // Fast forward past cooldown period
        await time.increase(82801);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("200")]);

        expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("420"));
        expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("200"));
      });

      it("Should reject minting before cooldown expires", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

        await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);
        await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

        // Try to mint before cooldown expires
        await expect(
          buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("100")]),
        ).to.be.revertedWith("Cooldown period not expired");
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

      it("Should check global limit for total amount in batch", async function () {
        const { buidlGuidlBread, rpcBreadMinter, user1, user2, user3 } =
          await loadFixture(deployBuidlGuidlBreadFixture);

        // Try to mint a batch that exceeds the global limit
        const addresses = [user1.address, user2.address, user3.address];
        const amounts = [parseEther("200"), parseEther("200"), parseEther("200")]; // Total 600 > 420 limit

        await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts)).to.be.revertedWith(
          "Mint amount exceeds global limit",
        );
      });
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete 2-function minting flow", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Step 1: Check readiness (should be 0 initially)
      expect(await buidlGuidlBread.getRemainingCooldown()).to.equal(0);

      // Step 2: Mint tokens
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("200"));
      expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(true);

      // Step 3: Complete period
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();
      expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(0);
      expect(await buidlGuidlBread.mintingOccurredThisPeriod()).to.equal(false);

      // Should not be able to mint again until cooldown expires
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("100")]),
      ).to.be.revertedWith("Cooldown period not expired");

      // After cooldown expires, should be able to mint again
      await time.increase(82801);
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("100")]);
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("100"));
    });

    it("Should handle complex minting scenario with pause", async function () {
      const { buidlGuidlBread, rpcBreadMinter, pauseAddress, user1, user2, user3 } =
        await loadFixture(deployBuidlGuidlBreadFixture);

      // Initial state check
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("1000000"));

      // Mint to multiple users (total 120)
      const addresses = [user1.address, user2.address, user3.address];
      const amounts = [parseEther("30"), parseEther("40"), parseEther("50")];
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts);

      // Check balances
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("30"));
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("40"));
      expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(parseEther("50"));

      // Total supply should increase
      expect(await buidlGuidlBread.totalSupply()).to.equal(parseEther("1000120"));

      // Check global minted amount
      expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(parseEther("120"));

      // Complete the period
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

      // Pause minting
      await buidlGuidlBread.connect(pauseAddress).pauseMinting();

      // Fast forward past cooldown but still in pause
      await time.increase(82801);

      // Try to mint more - should fail due to pause
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("10")]),
      ).to.be.revertedWith("Minting is currently paused");

      // Fast forward past pause
      await time.increase(86400);

      // Should be able to mint again
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("10")]);
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("40"));
    });

    it("Should respect global rate limits with new flow", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1, user2, user3 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Mint up to limit in multiple transactions
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("150")]);
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("150")]);
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user3.address], [parseEther("120")]);

      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("150"));
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("150"));
      expect(await buidlGuidlBread.balanceOf(user3.address)).to.equal(parseEther("120"));
      expect(await buidlGuidlBread.getGlobalMintedInPeriod()).to.equal(parseEther("420"));

      // Should reject trying to mint more
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("1")]),
      ).to.be.revertedWith("Mint amount exceeds global limit");

      // Complete period and wait for cooldown
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();
      await time.increase(82801);

      // Should be able to mint again
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("100")]);
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("250"));
    });

    it("Should handle owner functions correctly", async function () {
      const { buidlGuidlBread, owner, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Update mint limit
      await buidlGuidlBread.connect(owner).setMintLimit(parseEther("500"));
      expect(await buidlGuidlBread.mintLimit()).to.equal(parseEther("500"));

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
      const amounts = Array(100).fill(parseEther("4")); // Total 400, within 420 limit

      // Should succeed with exactly 100 items
      await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts)).to.not.be.reverted;
    });

    it("Should handle global rate limit boundary conditions", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Mint exactly the limit
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("420")]);

      // Check remaining amount is 0
      expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(0);

      // Complete period and check cooldown
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

      // Fast forward to just before cooldown expires
      await time.increase(82799);

      // Should still be in cooldown (1 second remaining)
      expect(await buidlGuidlBread.getRemainingCooldown()).to.equal(1);

      // Fast forward past cooldown
      await time.increase(1);

      // Now should be able to mint again (cooldown is over)
      expect(await buidlGuidlBread.getRemainingCooldown()).to.equal(0);
      expect(await buidlGuidlBread.getRemainingMintAmount()).to.equal(parseEther("420"));
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

    it("Should prevent the security vulnerability described in the requirements", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1, user2, user3 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Create many different addresses (simulating hacker creating many accounts)
      const manyAddresses = Array(50)
        .fill(0)
        .map(() => ethers.Wallet.createRandom().address);
      const amounts = Array(50).fill(parseEther("10")); // Total 500, exceeds 420 limit

      // Should reject the large batch that exceeds global limit
      await expect(buidlGuidlBread.connect(rpcBreadMinter).batchMint(manyAddresses, amounts)).to.be.revertedWith(
        "Mint amount exceeds global limit",
      );

      // Even if done in smaller batches to different addresses, global limit still applies
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("220")]);

      // Any further minting should fail regardless of address
      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user3.address], [parseEther("1")]),
      ).to.be.revertedWith("Mint amount exceeds global limit");
    });

    it("Should handle multiple minting periods correctly", async function () {
      const { buidlGuidlBread, rpcBreadMinter, user1, user2 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Period 1
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("200")]);
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

      // Wait for cooldown
      await time.increase(82801);

      // Period 2
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user2.address], [parseEther("300")]);
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

      // Wait for cooldown
      await time.increase(82801);

      // Period 3
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("100")]);

      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("300"));
      expect(await buidlGuidlBread.balanceOf(user2.address)).to.equal(parseEther("300"));
    });

    it("Should prevent the compromised minter attack scenario", async function () {
      const { buidlGuidlBread, rpcBreadMinter, pauseAddress, user1 } = await loadFixture(deployBuidlGuidlBreadFixture);

      // Simulate compromised minter: mint maximum amount
      await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("420")]);

      // Pause address detects and immediately pauses
      await buidlGuidlBread.connect(pauseAddress).pauseMinting();

      // Attacker tries to complete period to reset for next cycle - should fail
      await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.be.revertedWith(
        "Period completion paused",
      );

      // Fast forward 23+ hours (normal cooldown would be over)
      await time.increase(82801);

      // Attacker still can't complete period or mint more while paused
      await expect(buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod()).to.be.revertedWith(
        "Period completion paused",
      );

      await expect(
        buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("1")]),
      ).to.be.revertedWith("Minting is currently paused");

      // Only after pause expires (24 hours total) can operations resume
      await time.increase(86400 - 82801 + 1); // Complete the 24 hour pause

      // Now attacker can complete the old period
      await buidlGuidlBread.connect(rpcBreadMinter).completeMintingPeriod();

      // But owner multisig would have rotated keys by now, limiting damage to max 420 tokens
      expect(await buidlGuidlBread.balanceOf(user1.address)).to.equal(parseEther("420"));
    });
  });
});
