import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer, admin} = await getNamedAccounts();
return;
  await deploy('SimplePriceOracle', {
    from: deployer,
    log: true,
  });


};
export default func;
func.tags = ['SimplePriceOracle'];
