import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get, save} = deployments;

  const {deployer} = await getNamedAccounts();
  const treasuryPercentMantisa = "50000000000000000";
  const treasury = (await get('VTreasury')).address;
  const comptroller = (await get('Comptroller')).address;
  const vaiUnitroller = (await get('VAIUnitroller')).address;
  const vBNB = "0x0000000000000000000000000000000000000000"

  const comptrollerImpl = await deploy('Liquidator', {
    from: deployer,
    args : [deployer , vBNB, comptroller , vaiUnitroller , treasury , treasuryPercentMantisa],
    log: true
  });


};
export default func;
func.tags = ['Liquidator'];
// func.dependencies = ['Unitroller'];
