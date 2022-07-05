import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,get} = deployments;
 return;
  const {deployer} = await getNamedAccounts();
  const IStdReferenceAddress = '0x0c2362c9A0586Dd7295549C65a4A5e3aFE10a88A'


  await deploy('BraniacPriceOracle', {
    from: deployer,
    args: [IStdReferenceAddress],
    log: true,
  });
};
export default func;
func.tags = ['BraniacPriceOracle'];
