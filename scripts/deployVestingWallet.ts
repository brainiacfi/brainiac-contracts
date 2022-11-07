require('dotenv').config()
const hre = require('hardhat')
const ethers = hre.ethers

const beneficiaryAddress = '0x...' // address
const startsAt = '160...' // timestamp
const duration = '735...' // vesting duration (in seconds)

const BrainiacVestingWallet = async function () {
  const { getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  const BrainiacVestingWallet = await ethers.getContractFactory('BrainiacVestingWallet', await ethers.getSigner(deployer))
  const vestingWallet = await BrainiacVestingWallet.deploy(beneficiaryAddress, startsAt, duration)

  console.log(`VestingWallet deployed to`, vestingWallet.address)
}

try {
  BrainiacVestingWallet()
} catch (err) {
  console.error(err)
}
