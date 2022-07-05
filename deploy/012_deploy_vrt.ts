import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
return;
  const {deployer, admin} = await getNamedAccounts();

  await deploy('VRT', {
    from: deployer,
    args : [admin],
    log: true,
  });
};
export default func;
func.tags = ['VRT'];
