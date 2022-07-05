import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
 return;
  const {deployer, admin} = await getNamedAccounts();

  await deploy('VAIVaultProxy', {
    from: deployer,
    log: true,
  });

};
export default func;
func.tags = ['VAIVaultProxy'];
