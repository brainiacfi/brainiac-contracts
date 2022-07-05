require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const acceptVAIControllerImplementation = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;

  const { deployer } = await getNamedAccounts();
  //   const VAIControllerContract = await ethers.getContractFactory(
  //     "VAIController"
  //   );

  const VAIUnitroller = (await get("VAIUnitroller")).address;
  const VAIController = (await get("VAIController")).address;
  const VAIUnitrollerContract = await ethers.getContractFactory("VAIUnitroller")
  const VAIUnitrollerContractInstance = await VAIUnitrollerContract.attach(
    VAIUnitroller
  );
  const VAIControllerContract = await ethers.getContractFactory("VAIController")
  const VAIControllerContractInstance = await VAIControllerContract.attach(
    VAIController
  );

  const tx = await VAIUnitrollerContractInstance._setPendingImplementation(VAIController)
  console.log(tx);
  const pendingImplementation = await VAIUnitrollerContractInstance.pendingImplementation();
  const becomeImplemenatationTx = await VAIControllerContractInstance._become(VAIUnitroller)
  console.log(becomeImplemenatationTx)
  console.log(`Transaction successfull VAIController with address "${pendingImplementation}" become Implementation for proxy`)
};

export default acceptVAIControllerImplementation;
