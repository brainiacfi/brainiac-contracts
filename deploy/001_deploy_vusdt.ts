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
  const { deploy, get, save } = deployments;

  const { deployer, admin } = await getNamedAccounts();
  return;
  const usdtAddress = '0x10A86c9C8CbE7cf2849bfCb0EaBE39b3bFEc91D4';
  const comptrollerImplementation = (await get("Comptroller"))
    .address;
  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModel"))
    .address;                             
  const initialExchangeRate = "200776461931237"
  const name = "Brainiac : bUSDT";
  const symbol = "bUSDT";
  const decimal = 8;
  const Implementation = (await get("VBep20Delegate")).address;

 const vUSDT = await deploy("VBep20Delegator", {
    from: deployer,
    args: [
      usdtAddress,
      comptrollerImplementation,
      whitePaperInterestRateModel,
      initialExchangeRate,
      name,
      symbol,
      decimal,
      admin,
      Implementation,
      '0x',
    ],
    log: true,
    gasLimit: 4000000,
  });

  await save('BUSDT', {
    abi: vUSDT.abi,
    address: vUSDT.address
  });

};
export default func;
func.tags = ["BUSDT"];
