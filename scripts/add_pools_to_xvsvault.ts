require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const main = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;
  const { deployer } = await getNamedAccounts();

  const XVSAddress = (await get("XVS")).address;
  const XVSStoreAddress = (await get("XVSStore")).address;
  const XVSVaultProxy = (await get("XVSVaultProxy")).address;
  const xvsVault = (await get("XVSVault")).address;
  const XVSVaultProxyContract = await ethers.getContractFactory(
    "XVSVault"
  );
  const XVSVaultProxyContractInstance = await XVSVaultProxyContract.attach(
    XVSVaultProxy
  );
  const xvsVaultContract = await ethers.getContractFactory("XVSVault")
  const xvsVaultContractInstance = await xvsVaultContract.attach(
    xvsVault
  );

  const allocPoint = 100;
  const rewardPerBlock = "00";
  const lockPeriod = 604800;
//   const txSetStore = await XVSVaultProxyContractInstance.setXvsStore(
//     XVSAddress,
//     XVSStoreAddress
//   );
//   await txSetStore.wait();
//   console.log(txSetStore)
  console.log("xvs vault store is set")
   
  const tx2 = await XVSVaultProxyContractInstance._setPendingImplementation(xvsVault)
  await tx2.wait()
  console.log(tx2);
  const pendingImplementation = await XVSVaultProxyContractInstance.pendingXVSVaultImplementation();
  const becomeImplemenatationTx = await xvsVaultContractInstance._become(XVSVaultProxy)
  await becomeImplemenatationTx.wait()
  console.log(becomeImplemenatationTx)
  console.log(`Transaction successfull xvsVault with address "${pendingImplementation}" become Implementation for proxy`)

  const tx = await XVSVaultProxyContractInstance.add(
    XVSAddress,
    allocPoint,
    XVSAddress,
    rewardPerBlock,
    lockPeriod
  );
  await tx.wait();
  console.log(tx)
  console.log("pools are added")


};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
