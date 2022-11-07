// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const main = async () => {
//   const { deployments, getNamedAccounts, network } = hre;
//   const { get } = deployments;

//   const { deployer } = await getNamedAccounts();
//   //   const BRNVestingContract = await ethers.getContractFactory(
//   //     "BRNVesting"
//   //   );

//   const BRNVestingProxy = (await get("BRNVestingProxy")).address;
//   const BRNVesting = (await get("BRNVesting")).address;
//   const BRNVestingProxyContract = await ethers.getContractFactory("BRNVestingProxy")
//   const BRNVestingProxyContractInstance = await BRNVestingProxyContract.attach(
//     BRNVestingProxy
//   );
//   const BRNVestingContract = await ethers.getContractFactory("BRNVesting")
//   const BRNVestingContractInstance = await BRNVestingContract.attach(
//     BRNVesting
//   );

//   const tx = await BRNVestingProxyContractInstance._setPendingImplementation(BRNVesting)
//   console.log(tx);
//   const pendingImplementation = await BRNVestingProxyContractInstance.pendingImplementation();
//   const becomeImplemenatationTx = await BRNVestingContractInstance._become(BRNVestingProxy)
//   console.log(becomeImplemenatationTx)
//   console.log(`Transaction successfull BRNVesting with address "${pendingImplementation}" become Implementation for proxy`)
// };

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
