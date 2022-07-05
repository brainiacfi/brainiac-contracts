import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,get} = deployments;
return ;
  const {deployer} = await getNamedAccounts();
  const vBnbAddress = (await get('VBNB')).address

  await deploy('Maximillion', {
    from: deployer,
    args: [vBnbAddress],
    log: true,
  });
};
export default func;
func.tags = ['Maximillion'];
