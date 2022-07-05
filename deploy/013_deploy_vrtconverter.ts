import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy} = deployments;
 return;
  const {deployer, admin} = await getNamedAccounts();

  await deploy('VRTConverter', {
    from: deployer,
    log: true,
  });
};
export default func;
func.tags = ['VRTConverter'];
