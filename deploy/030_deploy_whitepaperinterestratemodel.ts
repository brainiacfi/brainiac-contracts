import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  return;
  const {deployer, admin} = await getNamedAccounts();
 
  const baseRatePerYear  = 1902587519;
  const multiplier = 9512937595;

  await deploy('WhitePaperInterestRateModel', {
    from: deployer,
    args:[baseRatePerYear , multiplier],
    log: true,
  });
};
export default func;
func.tags = ['WhitePaperInterestRateModel'];
