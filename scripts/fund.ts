const { ethers } = require("hardhat");
const hre = require("hardhat");

async function addFunds() {

  const { deployments, getNamedAccounts, network } = hre;
  const { get, execute } = deployments;

  const daiAddress = (await get("BRUSDC")).address
  const daiAbi = (await get("BRUSDC")).abi

  const accountToImpersonate = "0x00c69071A6aD8a331D70d2F5Cca5C09efC355Ea4"
  // const accountToFund = "0x65698468F12A25885602B9F925b0f5e09E4857e9"
  // const amountToMove = "50000"

  // await hre.network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: [accountToImpersonate],
  // });

  const signer = await ethers.provider.getSigner("0xCaEBe8353b11B23546AD51eC7a51bF3F673E47DC")
  const daiContract = new ethers.Contract(daiAddress, daiAbi,signer)

  const accountBalanceWhale = await daiContract.balanceOfUnderlying("0xCaEBe8353b11B23546AD51eC7a51bF3F673E47DC")
 const t =  await accountBalanceWhale.wait()
  console.log("accountBalance", t )

  await daiContract.connect(signer)._setComptrollerLens("0x0a80Af4Df341014E35b844204eb1F9482a18577A")

  // const l = await daiContract.liquidatorContract()
  // console.log("liquidator", l)
}

async function main() {
  await addFunds();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
