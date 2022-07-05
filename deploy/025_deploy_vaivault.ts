import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy} = deployments;
 return;
  const {deployer} = await getNamedAccounts();

  await deploy('VAIVault', {
    from: deployer,
    log: true,
  });
};
export default func;
func.tags = ['VAIVault'];
