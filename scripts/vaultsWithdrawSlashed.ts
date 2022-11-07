require("dotenv").config();
const hre = require("hardhat");
import { parseEther } from "ethers/lib/utils";
const ethers = hre.ethers;

const vaults = [
  'BRNCkbLpLockedStaking16Weeks',
  'BRNCkbLpLockedStaking12Weeks',
  'BRNCkbLpLockedStaking10s',

  'BRNLockedStaking12Weeks',
  'BRNLockedStaking10s'
]

async function main () {
  const { deployments, getNamedAccounts, network } = hre;
  const { get, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  let totalSlashedToken = 0
  for (let vaultName of vaults) {
    const vaultInfo = await get(vaultName)
    const vaultContract = await ethers.getContractFactory('BrainiacLockedStaking');
    const vaultContractInstance = await vaultContract.attach(vaultInfo.address);

    // console.log(vaultContractInstance)
    const slashedTokenAmount = await vaultContractInstance.slashedTokenAmount()
    totalSlashedToken = slashedTokenAmount.add(totalSlashedToken)
    await vaultContractInstance.withdrawSlashedTokens(slashedTokenAmount)
    console.log(`Accumulated ${slashedTokenAmount.toString()} slashed amount in ${vaultName}`)
  }
  console.log(`Total amount:`, totalSlashedToken.toString())
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
