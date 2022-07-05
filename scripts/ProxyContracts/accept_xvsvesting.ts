// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const main = async () => {
//   const { deployments, getNamedAccounts, network } = hre;
//   const { get } = deployments;

//   const { deployer } = await getNamedAccounts();
//   //   const XVSVestingContract = await ethers.getContractFactory(
//   //     "XVSVesting"
//   //   );

//   const XVSVestingProxy = (await get("XVSVestingProxy")).address;
//   const XVSVesting = (await get("XVSVesting")).address;
//   const XVSVestingProxyContract = await ethers.getContractFactory("XVSVestingProxy")
//   const XVSVestingProxyContractInstance = await XVSVestingProxyContract.attach(
//     XVSVestingProxy
//   );
//   const XVSVestingContract = await ethers.getContractFactory("XVSVesting")
//   const XVSVestingContractInstance = await XVSVestingContract.attach(
//     XVSVesting
//   );

//   const tx = await XVSVestingProxyContractInstance._setPendingImplementation(XVSVesting)
//   console.log(tx);
//   const pendingImplementation = await XVSVestingProxyContractInstance.pendingImplementation();
//   const becomeImplemenatationTx = await XVSVestingContractInstance._become(XVSVestingProxy)
//   console.log(becomeImplemenatationTx)
//   console.log(`Transaction successfull XVSVesting with address "${pendingImplementation}" become Implementation for proxy`)
// };

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
