require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const acceptVRTVaultImplementation = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;

  const { deployer } = await getNamedAccounts();
  //   const VRTVaultContract = await ethers.getContractFactory(
  //     "VRTVault"
  //   );

  const VRTVaultProxy = (await get("VRTVaultProxy")).address;
  const VRTVault = (await get("VRTVault")).address;
  const VRTVaultProxyContract = await ethers.getContractFactory("VRTVaultProxy")
  const VRTVaultProxyContractInstance = await VRTVaultProxyContract.attach(
    VRTVaultProxy
  );
  const VRTVaultContract = await ethers.getContractFactory("VRTVault")
  const VRTVaultContractInstance = await VRTVaultContract.attach(
    VRTVault
  );

  const tx = await VRTVaultProxyContractInstance._setPendingImplementation(VRTVault)
  await tx.wait()
  console.log(tx);
  const pendingImplementation = await VRTVaultProxyContractInstance.pendingImplementation();
  const becomeImplemenatationTx = await VRTVaultContractInstance._become(VRTVaultProxy)
 // await becomeImplemenatationTx.then((res:any)=>{console.log(res)})
 await becomeImplemenatationTx.wait()
  console.log(becomeImplemenatationTx)
  console.log(`Transaction successfull VRTVault with address "${pendingImplementation}" become Implementation for proxy`)
};

export default acceptVRTVaultImplementation;
