import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, admin} = await getNamedAccounts();
 return;
  const  delay = 172800;

  await deploy('Timelock', {
    from: deployer,
    gasLimit: 4000000,
    args : [admin , delay],
    log: true,
  });
};
export default func;
func.tags = ['Timelock'];
