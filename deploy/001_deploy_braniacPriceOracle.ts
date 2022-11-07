import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getAssetAddresses} from "../utils/helper"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,get,execute} = deployments;

  const {deployer} = await getNamedAccounts();
  const assetAddresses = getAssetAddresses();
  const IStdReferenceAddress = assetAddresses?.bandOracle;

  console.log(`Using Band Oracle Address:`, IStdReferenceAddress);

  await deploy('BraniacPriceOracle', {
    from: deployer,
    args: [IStdReferenceAddress],
    log: true,
  });
};
export default func;
func.tags = ['BraniacPriceOracle','Core'];
