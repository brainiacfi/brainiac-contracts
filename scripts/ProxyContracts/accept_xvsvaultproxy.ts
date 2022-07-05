require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const acceptXVSVaultImplementation = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;

  const { deployer } = await getNamedAccounts();
  //   const xvsVaultContract = await ethers.getContractFactory(
  //     "XVSVault"
  //   );

  const xvsVaultProxy = (await get("XVSVaultProxy")).address;
  const xvsVault = (await get("XVSVault")).address;
  const xvsVaultProxyContract = await ethers.getContractFactory("XVSVaultProxy")
  const xvsVaultProxyContractInstance = await xvsVaultProxyContract.attach(
    xvsVaultProxy
  );
  const xvsVaultContract = await ethers.getContractFactory("XVSVault")
  const xvsVaultContractInstance = await xvsVaultContract.attach(
    xvsVault
  );

  const tx = await xvsVaultProxyContractInstance._setPendingImplementation(xvsVault)
  await tx.wait()
  console.log(tx);
  const pendingImplementation = await xvsVaultProxyContractInstance.pendingXVSVaultImplementation();
  const becomeImplemenatationTx = await xvsVaultContractInstance._become(xvsVaultProxy)
  await becomeImplemenatationTx.wait()
  console.log(becomeImplemenatationTx)
  console.log(`Transaction successfull xvsVault with address "${pendingImplementation}" become Implementation for proxy`)
};

export default acceptXVSVaultImplementation;
