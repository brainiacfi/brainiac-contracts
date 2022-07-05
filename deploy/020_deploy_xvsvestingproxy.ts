import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy, get} = deployments;
  return;
  const {deployer} = await getNamedAccounts();
  const xvsVestingAddress = (await get('XVSVesting')).address;
  const xvsAddress = (await get('XVS')).address;

  await deploy('XVSVestingProxy', {
    from: deployer,
    args : [xvsVestingAddress, xvsAddress],
    log: true,
  });
};
export default func;
func.tags = ['XVSVestingProxy'];
