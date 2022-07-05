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
  const { deploy, get,  save } = deployments;
  return;
  const { deployer, admin } = await getNamedAccounts();

  const xvsAddress = (await get("XVS")).address;
  const comptrollerImplementation = (await get("Comptroller"))
    .address;
  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModel"))
    .address;
  const initialExchangeRate = bnbMantissa(216800624.92433866547106569);
  const name = "Brainiac : vXVS";
  const symbol = "vXVS";
  const decimal = 8;
  const Implementation = (await get("VBep20Delegate")).address;

  const vXVS = await deploy("VBep20Delegator", {
    from: deployer,
    args: [
      xvsAddress,
      comptrollerImplementation,
      whitePaperInterestRateModel,
      initialExchangeRate,
      name,
      symbol,
      decimal,
      admin,
      Implementation ,
      '0x',
    ],
    log: true,
    gasLimit: 4000000,
  });

  await save('VXVS', {
    abi: vXVS.abi,
    address: vXVS.address
  });
};
export default func;
func.tags = ["VBep20Delegator"];
