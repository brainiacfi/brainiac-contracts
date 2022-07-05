require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const acceptVRTConvertImplementation = async () => {
  const { deployments, getNamedAccounts, network } = hre;
  const { get } = deployments;

  const { deployer } = await getNamedAccounts();
  //   const VRTConverterContract = await ethers.getContractFactory(
  //     "VRTConverter"
  //   );

  const VRTConverterProxy = (await get("VRTConverterProxy")).address;
  const VRTConverter = (await get("VRTConverter")).address;
  const VRTConverterProxyContract = await ethers.getContractFactory("VRTConverterProxy")
  const VRTConverterProxyContractInstance = await VRTConverterProxyContract.attach(
    VRTConverterProxy
  );
  const VRTConverterContract = await ethers.getContractFactory("VRTConverter")
  const VRTConverterContractInstance = await VRTConverterContract.attach(
    VRTConverter
  );

  const tx = await VRTConverterProxyContractInstance._setPendingImplementation(VRTConverter)
  console.log(tx);
  const pendingImplementation = await VRTConverterProxyContractInstance.pendingImplementation();
  const becomeImplemenatationTx = await VRTConverterContractInstance._become(VRTConverterProxy)
  console.log(becomeImplemenatationTx)
  console.log(`Transaction successfull VRTConverter with address "${pendingImplementation}" become Implementation for proxy`)
};

export default acceptVRTConvertImplementation;
