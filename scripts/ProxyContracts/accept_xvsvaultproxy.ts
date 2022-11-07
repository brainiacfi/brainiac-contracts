require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const acceptBRNVaultImplementation = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;

  const { deployer } = await getNamedAccounts();
  //   const brnVaultContract = await ethers.getContractFactory(
  //     "BRNVault"
  //   );

  const brnVaultProxy = (await get("BRNVaultProxy")).address;
  const brnVault = (await get("BRNVault")).address;
  const brnVaultProxyContract = await ethers.getContractFactory("BRNVaultProxy")
  const brnVaultProxyContractInstance = await brnVaultProxyContract.attach(
    brnVaultProxy
  );
  const brnVaultContract = await ethers.getContractFactory("BRNVault")
  const brnVaultContractInstance = await brnVaultContract.attach(
    brnVault
  );

  const tx = await brnVaultProxyContractInstance._setPendingImplementation(brnVault)
  await tx.wait()
  console.log(tx);
  const pendingImplementation = await brnVaultProxyContractInstance.pendingBRNVaultImplementation();
  const becomeImplemenatationTx = await brnVaultContractInstance._become(brnVaultProxy)
  await becomeImplemenatationTx.wait()
  console.log(becomeImplemenatationTx)
  console.log(`Transaction successfull brnVault with address "${pendingImplementation}" become Implementation for proxy`)
};

export default acceptBRNVaultImplementation;
