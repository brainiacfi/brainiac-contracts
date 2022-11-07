import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
const BigNum = require("bignumber.js");
const ethers = require("ethers");

function ckbMantissa(num: number, scale = 1e18) {
  if (num < 0)
    return ethers.BigNumber.from(new BigNum(2).pow(256).plus(num).toFixed());
  return ethers.BigNumber.from(new BigNum(num).times(scale).toFixed());
}

import {parseEther} from 'ethers/lib/utils';

const BRToken = {
  name : "Brainiac brBRN",
  symbol : "brBRN",
  decimal : 8,
  initialExchangeRateMantissa: ckbMantissa(216800624.92433866547106569),
  collateralFactor :  parseEther('0.00'),
  reserveFactor :   parseEther('0.20'),
  supplyPaused : true,
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get,  save, execute } = deployments;

  const { deployer, admin } = await getNamedAccounts();

  const brnAddress = (await get("BRN")).address;

  const comptrollerImplementation = (await get("Comptroller")).address;
  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModelBRCKB")).address;
  const Implementation = (await get("BRErc20Delegate")).address;

  const brBRN = await deploy("BRErc20Delegator", {
    from: deployer,
    args: [
      brnAddress,
      comptrollerImplementation,
      whitePaperInterestRateModel,
      BRToken.initialExchangeRateMantissa,
      BRToken.name,
      BRToken.symbol,
      BRToken.decimal,
      admin,
      Implementation ,
      '0x',
    ],
    log: true,
    gasLimit: 4000000,
  });

  await save('BRBRN', {
    abi: brBRN.abi,
    address: brBRN.address
  });

  console.log(`---- Adding ${brBRN.address} to markets`);
  await execute('Comptroller', { from: deployer }, '_supportMarket', brBRN.address);
  await execute('Comptroller', { from: deployer }, '_setBrBRNTokenAddress', brBRN.address);

  console.log('----Setting colleteralFactor----');
  await execute('Comptroller', { from: deployer }, '_setCollateralFactor', brBRN.address , BRToken.collateralFactor );

  console.log('----Setting Mint and Borrow Paused ----');
  await execute('Comptroller', { from: deployer }, '_setMintPaused', brBRN.address , BRToken.supplyPaused );
  await execute('Comptroller', { from: deployer }, '_setBorrowPaused', brBRN.address , BRToken.supplyPaused );

  console.log(`----Setting Reserve Factor---`)
  await execute('BRErc20Delegator', { from: deployer }, '_setReserveFactor', BRToken.reserveFactor);
};
export default func;
func.tags = ["BRBRN","BRTOKENS"];
// func.dependencies = ['BRErc20Delegate','WhitePaperInterestRateModel','Comptroller','BRN'];