import { ethers } from "hardhat";
import { parseEther, formatEther } from "ethers";

async function main() {
  console.log("🍞 BuidlGuidlBread Contract Interaction Demo\n");

  // Get signers
  const [deployer, rpcBreadMinter, user1, user2] = await ethers.getSigners();

  console.log("Signers:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  RPC Bread Minter: ${rpcBreadMinter.address}`);
  console.log(`  User1: ${user1.address}`);
  console.log(`  User2: ${user2.address}\n`);

  // Deploy the contract
  console.log("Deploying BuidlGuidlBread contract...");
  const BuidlGuidlBreadFactory = await ethers.getContractFactory("BuidlGuidlBread");
  const buidlGuidlBread = await BuidlGuidlBreadFactory.deploy(rpcBreadMinter.address);
  await buidlGuidlBread.waitForDeployment();

  const contractAddress = await buidlGuidlBread.getAddress();
  console.log(`BuidlGuidlBread contract deployed to: ${contractAddress}\n`);

  // Check initial state
  console.log("📊 Initial Contract State:");
  console.log(`  Name: ${await buidlGuidlBread.name()}`);
  console.log(`  Symbol: ${await buidlGuidlBread.symbol()}`);
  console.log(`  Total Supply: ${formatEther(await buidlGuidlBread.totalSupply())} BGBRD`);
  console.log(`  Deployer Balance: ${formatEther(await buidlGuidlBread.balanceOf(deployer.address))} BGBRD`);
  console.log(`  Mint Limit: ${formatEther(await buidlGuidlBread.mintLimit())} BGBRD`);
  console.log(`  Mint Cooldown: ${await buidlGuidlBread.mintCooldown()} seconds (24 hours)\n`);

  // Test batch minting
  console.log("🚀 Testing Batch Minting:");
  const addresses = [user1.address, user2.address];
  const amounts = [parseEther("50"), parseEther("75")];

  console.log(`  Minting ${formatEther(amounts[0])} BGBRD to ${user1.address}`);
  console.log(`  Minting ${formatEther(amounts[1])} BGBRD to ${user2.address}`);

  const mintTx = await buidlGuidlBread.connect(rpcBreadMinter).batchMint(addresses, amounts);
  await mintTx.wait();
  console.log(`  ✅ Batch mint successful! Tx: ${mintTx.hash}\n`);

  // Check balances after minting
  console.log("💰 Balances After Minting:");
  for (let i = 0; i < addresses.length; i++) {
    const balance = await buidlGuidlBread.balanceOf(addresses[i]);
    console.log(`  ${addresses[i]}: ${formatEther(balance)} BGBRD`);
  }
  console.log();

  // Check rate limiting info
  console.log("⏰ Rate Limiting Information:");
  for (let i = 0; i < addresses.length; i++) {
    const mintedInPeriod = await buidlGuidlBread.getMintedInPeriod(addresses[i]);
    const remainingAmount = await buidlGuidlBread.getRemainingMintAmount(addresses[i]);
    const remainingCooldown = await buidlGuidlBread.getRemainingCooldown(addresses[i]);

    console.log(`  ${addresses[i]}:`);
    console.log(`    Minted in Period: ${formatEther(mintedInPeriod)} BGBRD`);
    console.log(`    Remaining Amount: ${formatEther(remainingAmount)} BGBRD`);
    console.log(`    Remaining Cooldown: ${remainingCooldown} seconds`);
  }
  console.log();

  // Test rate limit enforcement
  console.log("🚫 Testing Rate Limit Enforcement:");
  try {
    console.log(`  Attempting to mint ${formatEther(parseEther("60"))} BGBRD to ${user1.address} (should fail)`);
    await buidlGuidlBread.connect(rpcBreadMinter).batchMint([user1.address], [parseEther("60")]);
    console.log("  ❌ This should not have succeeded!");
  } catch (error: any) {
    console.log(`  ✅ Rate limit enforced: ${error.reason || error.message}\n`);
  }

  // Test owner functions
  console.log("👑 Testing Owner Functions:");
  console.log("  Updating mint limit to 150 BGBRD...");
  const newLimit = parseEther("150");
  const limitTx = await buidlGuidlBread.connect(deployer).setMintLimit(newLimit);
  await limitTx.wait();
  console.log(`  ✅ New mint limit: ${formatEther(await buidlGuidlBread.mintLimit())} BGBRD\n`);

  // Test batch burning
  console.log("🔥 Testing Batch Burning:");
  const burnAddresses = [user1.address, user2.address];
  const burnAmounts = [parseEther("10"), parseEther("15")];

  console.log(`  Burning ${formatEther(burnAmounts[0])} BGBRD from ${user1.address}`);
  console.log(`  Burning ${formatEther(burnAmounts[1])} BGBRD from ${user2.address}`);

  const burnTx = await buidlGuidlBread.connect(rpcBreadMinter).batchBurn(burnAddresses, burnAmounts);
  await burnTx.wait();
  console.log(`  ✅ Batch burn successful! Tx: ${burnTx.hash}\n`);

  // Final balances
  console.log("💰 Final Balances:");
  for (let i = 0; i < addresses.length; i++) {
    const balance = await buidlGuidlBread.balanceOf(addresses[i]);
    console.log(`  ${addresses[i]}: ${formatEther(balance)} BGBRD`);
  }

  const finalTotalSupply = await buidlGuidlBread.totalSupply();
  console.log(`  Total Supply: ${formatEther(finalTotalSupply)} BGBRD\n`);

  // Test unauthorized access
  console.log("🔒 Testing Access Control:");
  try {
    console.log("  Attempting unauthorized batch mint (should fail)...");
    await buidlGuidlBread.connect(user1).batchMint([user2.address], [parseEther("10")]);
    console.log("  ❌ This should not have succeeded!");
  } catch (error: any) {
    console.log(`  ✅ Access control enforced: ${error.reason || error.message}`);
  }

  try {
    console.log("  Attempting unauthorized owner function (should fail)...");
    await buidlGuidlBread.connect(user1).setMintLimit(parseEther("200"));
    console.log("  ❌ This should not have succeeded!");
  } catch (error: any) {
    console.log(`  ✅ Access control enforced: ${error.reason || error.message}\n`);
  }

  console.log("🎉 BuidlGuidlBread contract interaction demo completed successfully!");
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log("📖 Use this address to interact with the contract in the debug UI at http://localhost:3000/debug");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
