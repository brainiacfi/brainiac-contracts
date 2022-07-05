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
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get , save} = deployments;
  const { deployer, admin } = await getNamedAccounts();
return ;
  const comptrollerImplementation = (await get("Comptroller"))
    .address;
  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModel"))
    .address;
  const initialExchangeRate = bnbMantissa(216800624.92433866547106569);
  const name = "Brainiac : bBNB";
  const symbol = "bBNB";
  const decimal = 8;

   await deploy("VBNB", {
    from: deployer,
    args: [
      comptrollerImplementation,
      whitePaperInterestRateModel,
      initialExchangeRate,
      name,
      symbol,
      decimal,
      admin,
    ],
    log: true,
  });
};
export default func;
func.tags = ["VBNB"];
