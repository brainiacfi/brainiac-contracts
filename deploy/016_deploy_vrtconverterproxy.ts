import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
const BigNum = require("bignumber.js");
const ethers = require("ethers");

function bnbMantissa(num: number, scale = 1e18) {
  if (num < 0)
    return ethers.BigNumber.from(new BigNum(2).pow(256).plus(num).toFixed());
  return ethers.BigNumber.from(new BigNum(num).times(scale).toFixed());
}
function getEpochTimeInSeconds() {
  return Math.round(new Date().getTime() / 1000);
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;
 return;
  const { deployer, admin } = await getNamedAccounts();
 
  const vrtConverterAddress = (await get("VRTConverter")).address;
  const vrtAddress = (await get("VRT")).address;
  const xvsAddress = (await get("XVS")).address;
  const conversionRatio = bnbMantissa(0.000083333333333);
  const conversionStartTime = getEpochTimeInSeconds() + 1000;
  const conversionPeriod = 365 * 24 * 60 * 60;

  await deploy("VRTConverterProxy", {
    from: deployer,
    args: [
      vrtConverterAddress,
      vrtAddress,
      xvsAddress,
      conversionRatio,
      conversionStartTime,
      conversionPeriod,
    ],
    log: true,
  });
};
export default func;
func.tags = ["VRTConverterProxy"];
