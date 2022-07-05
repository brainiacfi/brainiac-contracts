import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get, save} = deployments;
 return;
  const {deployer} = await getNamedAccounts();

  const comptrollerImpl = await deploy('ComptrollerG2', {
    from: deployer,
    log: true
  });

};
export default func;
func.tags = ['ComptrollerG2'];
// func.dependencies = ['Unitroller'];
