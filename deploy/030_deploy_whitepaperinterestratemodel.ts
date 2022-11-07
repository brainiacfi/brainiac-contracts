import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils'
import BigNumber from 'bignumber.js';

// BSC
const venusBlocksPerYear = 60 * 60 * 24 * 365 / 3

const marketsData = [{
  // reference vToken: https://bscscan.com/address/0xeca88125a5adbe82614ffc12d0db554e2e2867c8#readProxyContract
  // reference interestRateModel: https://bscscan.com/address/0x9e47c4f8654edfb45bc81e7e320c8fc1ad0acb73#readContract
  id: 'BRUSDC',
  baseRatePerBlock: 0,
  multiplierPerBlock: '4756468797'
}, {
  // reference vToken: https://bscscan.com/address/0xf508fCD89b8bd15579dc79A6827cB4686A3592c8#code
  // reference interestRateModel: https://bscscan.com/address/0x8683b97aa8ea1f5a0d65cdba6fa78782aa77c193#readContract
  id: 'BRETH',
  baseRatePerBlock: 0,
  multiplierPerBlock: '12052891933'
},
{
  // reference vToken: https://bscscan.com/address/0xf508fCD89b8bd15579dc79A6827cB4686A3592c8#code
  // reference interestRateModel: https://bscscan.com/address/0x8683b97aa8ea1f5a0d65cdba6fa78782aa77c193#readContract
  id: 'BRCKB',
  baseRatePerBlock: 0,
  multiplierPerBlock: '12052891933'
}]

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, admin} = await getNamedAccounts();

  for (let market of marketsData) {
    // compute rate per year based on rate per block
    let baseRatePerYear = new BigNumber(market.baseRatePerBlock).multipliedBy(venusBlocksPerYear)
    let multiplierPerYear = new BigNumber(market.multiplierPerBlock).multipliedBy(venusBlocksPerYear)

    // deploying interestRateModel for each market with id
    await deploy(`WhitePaperInterestRateModel${market.id}`, {
      from: deployer,
      contract : 'WhitePaperInterestRateModel',
      args: [baseRatePerYear.toString(), multiplierPerYear.toString()],
      log: true,
    });
  }
};

export default func;
func.tags = ['WhitePaperInterestRateModel','Core'];
//newMultiplierPerBlock = multiplierPerBlockfromVenus * godwokenBlockPerYear / venusBlockPerYear