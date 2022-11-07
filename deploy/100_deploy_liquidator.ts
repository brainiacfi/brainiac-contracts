import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get, save,execute} = deployments;
  const {deployer} = await getNamedAccounts();
  const treasuryPercentMantisa = "50000000000000000";
  const treasury = (await get('BRTreasury')).address;
  const comptroller = (await get('Comptroller')).address;
  const baiUnitroller = "0x0000000000000000000000000000000000000000" //(await get('BAIUnitroller')).address;
  const brCKB = (await get('BRCKB')).address;

  const liquidator = await deploy('Liquidator', {
    from: deployer,
    args : [deployer , brCKB, comptroller , baiUnitroller , treasury , treasuryPercentMantisa],
    log: true
  });
  await execute('Comptroller', { from: deployer }, '_setLiquidatorContract', liquidator.address);

};
export default func;
func.tags = ['Liquidator'];
func.dependencies = ['BRTreasury'];
