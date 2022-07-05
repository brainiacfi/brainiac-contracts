import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const BigNum = require("bignumber.js");
const ethers = require("ethers");

function bnbMantissa(num: number, scale = 1e18) {
  if (num < 0)
    return ethers.BigNumber.from(new BigNum(2).pow(256).plus(num).toFixed());
  return ethers.BigNumber.from(new BigNum(num).times(scale).toFixed());
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, admin} = await getNamedAccounts();
  return;
  const baseRatePerYear  = 0;
  const multiplierPerYear = bnbMantissa(0.19999999999728);
  const jumpMultiplierPerYear =  bnbMantissa(2.999999999990736);
  const kink = bnbMantissa(0.5);

  await deploy('JumpRateModel', {
    from: deployer,
    args:[baseRatePerYear , multiplierPerYear ,jumpMultiplierPerYear, kink],
    log: true,
  });
};
export default func;
func.tags = ['JumpRateModel'];
