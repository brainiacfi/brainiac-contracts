import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get, save,execute} = deployments;

  const {deployer,guardian} = await getNamedAccounts();

  const treasury = await deploy('BRTreasury', {
    from: deployer,
    log: true
  });
  const treasuryPercent = parseEther('0.05');
  console.log("Setting Treasury data in Comptroller")
  const tx = await execute('Comptroller', { from: deployer },'_setTreasuryData',guardian,treasury.address,treasuryPercent);
};

export default func;
func.tags = ['BRTreasury'];
