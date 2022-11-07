import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,get} = deployments;
return ;
  const {deployer} = await getNamedAccounts();
  const brCkbAddress = (await get('BRCKB')).address

  await deploy('Maximillion', {
    from: deployer,
    args: [brCkbAddress],
    log: true,
  });
};
export default func;
func.tags = ['Maximillion','Core'];
