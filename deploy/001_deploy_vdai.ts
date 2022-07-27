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
 return ;
  const { deployer, admin } = await getNamedAccounts();
  
  const usdcAddress = '0xA2370D7aFFf03e1E2FB77b28Fb65532636e0cB61';
  const comptrollerImplementation = (await get("Comptroller"))
    .address;
  const whitePaperInterestRateModel = (await get("WhitePaperInterestRateModel"))
    .address;                             
  const initialExchangeRate = bnbMantissa(200000000.000000000000000000);
  const name = "Brainiac : bDAI";
  const symbol = "bDAI";
  const decimal = 8;
  const Implementation = (await get("VBep20Delegate")).address;

 const vDAI = await deploy("VBep20Delegator", {
    from: deployer,
    args: [
      usdcAddress,
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

  await save('VDAI', {
    abi: vDAI.abi,
    address: vDAI.address
  });

};
export default func;
func.tags = ["VDAI"];
