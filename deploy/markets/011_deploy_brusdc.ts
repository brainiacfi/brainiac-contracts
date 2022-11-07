import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
const BigNum = require("bignumber.js");
const ethers = require("ethers");
import {getAssetAddresses} from "../../utils/helper"
import {parseEther} from 'ethers/lib/utils';

const BRToken = {
  name : "Brainiac brUSDC",
  symbol : "brUSDC",
  decimal : 8,
  initialExchangeRateMantissa : '200000000000000', // USDC is 6 decimals
  collateralFactor :  parseEther('0.80'),
  reserveFactor :   parseEther('0.20'),
  brainiacSpeed : parseEther('0.000'),
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get, save,execute } = deployments;

  const { deployer, admin } = await getNamedAccounts();
  const assetAddresses = getAssetAddresses();

  const usdcAddress = assetAddresses?.USDC;
  const comptrollerImplementation = (await get("Comptroller"))
    .address;
  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModelBRCKB"))
    .address;

  const Implementation = (await get("BRErc20Delegate")).address;

 const brUSDC = await deploy("BRErc20Delegator", {
    from: deployer,
    args: [
      usdcAddress,
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

  console.log(`---- Adding ${brUSDC.address} to markets ----`);
  await execute('Comptroller', { from: deployer }, '_supportMarket', brUSDC.address);
  console.log(`---- Setting colleteralFactor ----`);
  await execute('Comptroller', { from: deployer }, '_setCollateralFactor', brUSDC.address , BRToken.collateralFactor );

  console.log(`----Setting Reserve Factor---`)
  await execute('BRErc20Delegator', { from: deployer }, '_setReserveFactor', BRToken.reserveFactor);

  await save('BRUSDC', {
    abi: brUSDC.abi,
    address: brUSDC.address
  });

};
export default func;
func.tags = ["BRUSDC","BRTOKENS"];
// func.dependencies = ['BRErc20Delegate','WhitePaperInterestRateModel','Comptroller'];