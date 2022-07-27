require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const main = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;
  const { deployer } = await getNamedAccounts();


  const vTokenAddress = (await get("VETH")).address;
  const ComptrollerAddress = (await get("Comptroller")).address;
  const collateralFactor =  "800000000000000000";
  const comptrollerContract = await ethers.getContractFactory(
    "Comptroller"
  );
  const comptrollerContractInstance = await comptrollerContract.attach(
    ComptrollerAddress
  );

  const tx = await comptrollerContractInstance._supportMarket(vTokenAddress);
  await tx.wait();
  console.log(tx)
  console.log("market added")
  const tx2 = await comptrollerContractInstance.getAllMarkets();
  console.log(tx2)

  const tx3 = await comptrollerContractInstance._setCollateralFactor(vTokenAddress,collateralFactor);
  await tx3.wait();
  console.log(tx3)
   const tx4 = await comptrollerContractInstance.markets(vTokenAddress);
  console.log(tx4)
  


};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
