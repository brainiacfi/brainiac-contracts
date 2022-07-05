import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const BigNum = require('bignumber.js');
const ethers = require('ethers');

function bnbUnsigned(num : number) {
  return ethers.BigNumber.from(new BigNum(num).toFixed());
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,get} = deployments;
 
  const {deployer, admin} = await getNamedAccounts();
  const vrtVaultAddress =  (await get('VRTVault')).address;
  const vrtAddress =  (await get('VRT')).address;
  const interestRatePerBlockAsNumber = bnbUnsigned(2853881000);
 return;

  await deploy('VRTVaultProxy', {
    from: deployer,
    args : [vrtVaultAddress , vrtAddress , interestRatePerBlockAsNumber],
    log: true,
  });
};
export default func;
func.tags = ['VRTVaultProxy'];
