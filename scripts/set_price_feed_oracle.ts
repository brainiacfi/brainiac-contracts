// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const main = async () => {
//   const { deployments, getNamedAccounts, network } = hre;
//   const { get } = deployments;
//   const { deployer } = await getNamedAccounts();

//   const underlyingPrice = "518802490000000000";
//   const vTokenAddress = (await get("VSXP")).address;
//   const simplePriceOracleAddress = (await get("SimplePriceOracle")).address;
//   const simplePriceOracleContract = await ethers.getContractFactory(
//     "SimplePriceOracle"
//   );
//   const simplePriceOracleContractInstance = await simplePriceOracleContract.attach(
//     simplePriceOracleAddress
//   );

//   const tx = await simplePriceOracleContractInstance.setUnderlyingPrice(vTokenAddress,underlyingPrice);
//   await tx.wait();
//   console.log(tx)
//   console.log("market added")
//   const tx2 = await simplePriceOracleContractInstance.getUnderlyingPrice(vTokenAddress);
//   console.log(tx2)


// };

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
