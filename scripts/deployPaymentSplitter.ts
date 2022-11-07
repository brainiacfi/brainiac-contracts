require('dotenv').config()
const hre = require('hardhat')
const ethers = hre.ethers

const recievers = ['0x...'] // address(s) NOTE: length should match shares length
const shares = ['3', '5', '...'] // percentage value (specifying 3 & 5 will allocate 30% & 50% of the amount that will be sent to contract among the two addresses)

const deployPaymentSplitter = async function () {
  const { getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  const PaymentSplitterFactory = await ethers.getContractFactory('BrainiacPaymentSplitter', await ethers.getSigner(deployer))
  const paymentSplitter = await PaymentSplitterFactory.deploy(recievers, shares)

  console.log(`PaymentSplitter deployed to`, paymentSplitter.address)
}

try {
  deployPaymentSplitter()
} catch (err) {
  console.error(err)
}
