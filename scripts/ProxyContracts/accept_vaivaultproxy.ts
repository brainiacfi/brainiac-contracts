// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const acceptBAIVaultImplementation = async () => {
//   const { deployments, getNamedAccounts, network } = hre;
//   const { get } = deployments;

//   const { deployer } = await getNamedAccounts();
//     // const BAIVaultContract = await ethers.getContractFactory(
//     //   "BAIVault"
//     // );

//   const BAIVaultProxy = (await get("BAIVaultProxy")).address;
//   const BAIVault = (await get("BAIVault")).address;
//   const BAIVaultProxyContract = await ethers.getContractFactory("BAIVaultProxy")
//   const BAIVaultProxyContractInstance = await BAIVaultProxyContract.attach(
//     BAIVaultProxy
//   );
//   const BAIVaultContract = await ethers.getContractFactory("BAIVault")
//   const BAIVaultContractInstance = await BAIVaultContract.attach(
//     BAIVault
//   );

//   const tx = await BAIVaultProxyContractInstance._setPendingImplementation(BAIVault)
//   await tx.wait();
//   console.log(tx);
//   const pendingImplementation = await BAIVaultProxyContractInstance.pendingBAIVaultImplementation();
//  const becomeImplemenatationTx = await BAIVaultContractInstance._become(BAIVaultProxy)
//  await becomeImplemenatationTx.wait()
//  console.log(becomeImplemenatationTx)
//   console.log(`Transaction successfull BAIVault with address "${pendingImplementation}" become Implementation for proxy`)
// };

// export default acceptBAIVaultImplementation;
