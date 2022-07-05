import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get, save} = deployments;

  const {deployer} = await getNamedAccounts();
return
  const comptrollerImpl = await deploy('ComptrollerLens', {
    from: deployer,
    log: true
  });

};
export default func;
func.tags = ['ComptrollerLens'];
