import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
const BigNum = require("bignumber.js");
const ethers = require("ethers");

function bnbMantissa(num: number, scale = 1e18) {
  if (num < 0)
    return ethers.BigNumber.from(new BigNum(2).pow(256).plus(num).toFixed());
  return ethers.BigNumber.from(new BigNum(num).times(scale).toFixed());
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;
 
  const { deployer, admin } = await getNamedAccounts();
  const timelockAddress = (await get("Timelock")).address;
  const xvsVaultAddress = (await get("XVSVault")).address;
  const governorBravoDelegateAddress = (await get("GovernorBravoDelegate")).address;
  const votingPeriod = 172800;
  const votingDelay = 1;
  const proposalThreshold = bnbMantissa(150000);
  return;
  await deploy("GovernorBravoDelegator", {
    from: deployer,
    gasLimit: 4000000,
    args: [
      timelockAddress,
      xvsVaultAddress,
      admin,
      governorBravoDelegateAddress,
      votingPeriod,
      votingDelay,
      proposalThreshold,
      admin,
    ],
    log: true,
  });
};
export default func;
func.tags = ["GovernorBravoDelegator"];
