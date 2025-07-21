import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
// import { Contract, parseEther } from "ethers";

/**
 * Deploys a contract named "BuidlGuidlBread" using the deployer account and
 * constructor arguments set to the rpcBreadMinterAddress
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployBuidlGuidlBread: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network baseSepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying BuidlGuidlBread contract with deployer:", deployer);

  // Deploy with the specified deployer address as the rpcBreadMinterAddress
  await deploy("BuidlGuidlBread", {
    from: deployer,
    args: [
      "0x8c4f1FB34565650e176d2cd2761B3be10Ca8d35b",
      "0xaC9A4652dF3878d24f35A6a6c022544aeE9748Ff",
      "0x38c772B96D73733F425746bd368B4B4435A37967",
    ], // initialOwner, batchMinterAddress, pauseAddress
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  console.log("BuidlGuidlBread contract deployed successfully!");
};

export default deployBuidlGuidlBread;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags BuidlGuidlBread
deployBuidlGuidlBread.tags = ["BuidlGuidlBread"];
