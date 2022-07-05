// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const acceptVAIVaultImplementation = async () => {
//   const { deployments, getNamedAccounts, network } = hre;
//   const { get } = deployments;

//   const { deployer } = await getNamedAccounts();
//     // const VAIVaultContract = await ethers.getContractFactory(
//     //   "VAIVault"
//     // );

//   const VAIVaultProxy = (await get("VAIVaultProxy")).address;
//   const VAIVault = (await get("VAIVault")).address;
//   const VAIVaultProxyContract = await ethers.getContractFactory("VAIVaultProxy")
//   const VAIVaultProxyContractInstance = await VAIVaultProxyContract.attach(
//     VAIVaultProxy
//   );
//   const VAIVaultContract = await ethers.getContractFactory("VAIVault")
//   const VAIVaultContractInstance = await VAIVaultContract.attach(
//     VAIVault
//   );

//   const tx = await VAIVaultProxyContractInstance._setPendingImplementation(VAIVault)
//   await tx.wait();
//   console.log(tx);
//   const pendingImplementation = await VAIVaultProxyContractInstance.pendingVAIVaultImplementation();
//  const becomeImplemenatationTx = await VAIVaultContractInstance._become(VAIVaultProxy)
//  await becomeImplemenatationTx.wait()
//  console.log(becomeImplemenatationTx)
//   console.log(`Transaction successfull VAIVault with address "${pendingImplementation}" become Implementation for proxy`)
// };

// export default acceptVAIVaultImplementation;
