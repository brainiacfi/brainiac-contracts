import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
const BigNum = require("bignumber.js");
const ethers = require("ethers");
import {getAssetAddresses} from "../../utils/helper"
import {parseEther} from 'ethers/lib/utils';
function ckbMantissa(num: number, scale = 1e18) {
  if (num < 0)
    return ethers.BigNumber.from(new BigNum(2).pow(256).plus(num).toFixed());
  return ethers.BigNumber.from(new BigNum(num).times(scale).toFixed());
}

const BRToken = {
  name : "Brainiac brETH",
  symbol : "brETH",
  decimal : 8,
  initialExchangeRateMantissa : parseEther("200000000.000000000000000000"),
  collateralFactor :  parseEther('0.80'),
  reserveFactor :   parseEther('0.20'),
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get, save, execute } = deployments;

  const assetAddresses = getAssetAddresses();

  const { deployer, admin } = await getNamedAccounts();

  const ethAddress = assetAddresses?.ETH;

  const comptrollerImplementation = (await get("Comptroller")).address;

  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModelBRCKB")).address;

  const Implementation = (await get("BRErc20Delegate")).address;

 const brEth = await deploy("BRErc20Delegator", {
    from: deployer,
    args: [
      ethAddress,
      comptrollerImplementation,
      whitePaperInterestRateModel,
      BRToken.initialExchangeRateMantissa,
      BRToken.name,
      BRToken.symbol,
      BRToken.decimal,
      admin,
      Implementation,
      '0x',
    ],
    log: true,
    gasLimit: 4000000,
  });

  console.log(`---- Adding ${brEth.address} to markets ----`);
  await execute('Comptroller', { from: deployer }, '_supportMarket', brEth.address);
  console.log(`---- Setting colleteralFactor ----`);
  await execute('Comptroller', { from: deployer }, '_setCollateralFactor', brEth.address , BRToken.collateralFactor );

  console.log(`----Setting Reserve Factor---`)
  await execute('BRErc20Delegator', { from: deployer }, '_setReserveFactor', BRToken.reserveFactor);

  await save('BRETH', {
    abi:  brEth.abi,
    address:  brEth.address
  });

};
export default func;
func.tags = ["BRETH","BRTOKENS"];
// func.dependencies = ['BRErc20Delegate','WhitePaperInterestRateModel','Comptroller'];