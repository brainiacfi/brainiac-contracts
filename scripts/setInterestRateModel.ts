require("dotenv").config();
const hre = require("hardhat");
import { parseEther } from "ethers/lib/utils";
const ethers = hre.ethers;

const brTokens = ['BRCKB', 'BRETH', 'BRUSDC'];

async function main () {
  console.log('Updating InterestRateModel for Markets');
  const { deployments, getNamedAccounts, network } = hre;
  const { get, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(deployer)

  // Update InterestRateModels for brTokens (_setInterestRateModel)
  for (let brTokenName of brTokens) {
    const brToken = await get(brTokenName)

    const interestRateModelAddress =  (await get(`WhitePaperInterestRateModel${brTokenName}`)).address;
    console.log(`Updating InterestRateModel for brToken ${brTokenName} to ${interestRateModelAddress}`)
    await execute(`${brTokenName}`, { from: deployer }, '_setInterestRateModel', interestRateModelAddress);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
