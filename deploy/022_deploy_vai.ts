import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy} = deployments;

  const {deployer, admin} = await getNamedAccounts();
  const chainId  = network.config.chainId;
return;
console.log(chainId)

  await deploy('VAI', {
    from: deployer,
    args : [chainId],
    log: true,
  });
};
export default func;
func.tags = ['VAI'];
