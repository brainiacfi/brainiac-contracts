// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const acceptGovernorBravoDelegator = async () => {
//   const { deployments, getNamedAccounts, network } = hre;
//   const { get } = deployments;

//   const { deployer } = await getNamedAccounts();
//   //   const BAIControllerContract = await ethers.getContractFactory(
//   //     "BAIController"
//   //   );

//   const BAIUnitroller = (await get("BAIUnitroller")).address;
//   const BAIController = (await get("BAIController")).address;
//   const BAIUnitrollerContract = await ethers.getContractFactory("BAIUnitroller")
//   const BAIUnitrollerContractInstance = await BAIUnitrollerContract.attach(
//     BAIUnitroller
//   );
//   const BAIControllerContract = await ethers.getContractFactory("BAIController")
//   const BAIControllerContractInstance = await BAIControllerContract.attach(
//     BAIController
//   );

//   const tx = await BAIUnitrollerContractInstance._setPendingImplementation(BAIController)
//   console.log(tx);
//   const pendingImplementation = await BAIUnitrollerContractInstance.pendingImplementation();
//   const becomeImplemenatationTx = await BAIControllerContractInstance._become(BAIUnitroller)
//   console.log(becomeImplemenatationTx)
//   console.log(`Transaction successfull BAIController with address "${pendingImplementation}" become Implementation for proxy`)
// };

// export default acceptGovernorBravoDelegator;
