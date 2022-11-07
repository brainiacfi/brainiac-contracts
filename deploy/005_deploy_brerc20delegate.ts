import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('BRErc20Delegate', {
    from: deployer,
    log: true,
  });
};
export default func;
func.tags = ['BRErc20Delegate','Core'];
