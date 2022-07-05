import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,get} = deployments;

  const {deployer} = await getNamedAccounts();
  return ;

  await deploy('VTreasury', {
    from: deployer,
    log: true,
  });
};
export default func;
func.tags = ['VTreasury'];
