require("dotenv").config();
const hre = require("hardhat");
import { parseEther } from "ethers/lib/utils";
const ethers = hre.ethers;

// brToken Speeds are set PER BLOCK (1 block = 60s in Godwoken)
const brTokenSpeeds = {
  'BRETH':  '0.0264000000000000',
  'BRUSDC': '0.0330000000000000',
  'BRCKB':  '0.0726000000000000',
}

// Vault Speeds are set PER SECOND
const vaultSpeeds = {
  'BRNCkbLpLockedStaking16Weeks': '0.0146138666666667',
  'BRNCkbLpLockedStaking12Weeks': '0.0115808000000000',
  'BRNCkbLpLockedStaking10s':     '0.0013786666666667',

  'BRNLockedStaking12Weeks':      '0.0062040000000000',
  'BRNLockedStaking10s':          '0.0006893333333333',
}

async function main () {
  console.log('Starting setRewardSpeeds for brTokens and vault...')
  const { deployments, getNamedAccounts, network } = hre;
  const { get, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  // Set up comptroller
  const comptrollerAddress = (await get("Comptroller")).address;
  const comptrollerContract = await ethers.getContractFactory("Comptroller");
  const comptrollerContractInstance = await comptrollerContract.attach(
    comptrollerAddress
  );

  console.log(deployer)

  // Update speeds for brTokens (setBrainiacSpeed)
  for (let brTokenName of Object.keys(brTokenSpeeds)) {
    const brToken = await get(brTokenName)
    const brTokenAddress = brToken.address
    const speed = parseEther(brTokenSpeeds[brTokenName])

    console.log(`Setting speed for brToken ${brTokenName} to ${speed}`)
    await execute('Comptroller', { from: deployer }, '_setBrainiacSpeed', brTokenAddress, speed);

    const confirmedSpeed = await comptrollerContractInstance.brainiacSpeeds(brTokenAddress);
    console.log(`Updated brainiac reward speeds for ${brTokenName} to ${confirmedSpeed}`);
  }

  // Update speeds for vaults
  for (let vaultName of Object.keys(vaultSpeeds)) {
    const vault = await get(vaultName)
    const speed = parseEther(vaultSpeeds[vaultName])
    console.log(`Setting speed for vault ${vaultName} to ${speed}`)
    await execute(vaultName, { from: deployer }, 'setRewardSpeed', 0, speed);
    console.log('Updated')
    // const confirmedSpeed = 0; // TODO: Get the correct confirmed speed from contract instance
    // console.log(`Updated vault speed for ${vaultName} to ${confirmedSpeed}`)
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
