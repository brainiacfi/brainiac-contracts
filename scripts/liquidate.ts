require("dotenv").config();
const hre = require("hardhat");
import { parseEther } from "ethers/lib/utils";
const ethers = hre.ethers;

const brTokens = ["BRCKB", "BRETH", "BRUSDC"];

async function main() {
  console.log("Updating InterestRateModel for Markets");
  const { deployments, getNamedAccounts, network } = hre;
  const { get, execute } = deployments;
  const { deployer } = await getNamedAccounts();
  console.log(deployer)
  // await execute('BRETH', { from: deployer }, 'approve',"0xA6947A975e9d3a9EF41eB03De0859c941907da7B","100000000000000000" );
  // await hre.network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: ["0x48d14809e46c10b8789c30afef5e181a79993843"],
  // });
  // const signer = await ethers.getSigner("0x48d14809e46c10b8789c30afef5e181a79993843")
  // console.log(signer)
  // await execute('ETH', { from: signer.address }, 'transfer',"0x65698468F12A25885602B9F925b0f5e09E4857e9","10000000" );

  // console.log(signer);
//   const address = (await get("Liquidator")).address
//  await execute('USDC', { from: deployer }, 'approve',"0x04BF63Dd95B8B4B51D0E4D8527D59F2e9AB14f7C","100000000000" );
//  const t = await execute('BRUSDC', { from: deployer }, 'balanceOfUnderlying',deployer);
//  console.log(t.wait());
 const BRETH = (await get('BRETH')).address;
  const BRCKB = (await get('BRCKB')).address;
  const tx =  await execute(
      "Liquidator",
      { from: deployer },
      "liquidateBorrow",
      BRETH,
      "0x06e4cc6bF8096B78cdc1EAFd7cEf73e6eE58c09A",
      "1000000000000",
      BRCKB
    );
  console.log(tx)

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
