import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,execute, get, save} = deployments;

  const {deployer,admin,guardian} = await getNamedAccounts();

  await deploy('Unitroller', {
    from: deployer,
    log: true,
  });

  console.log(`Setting ${admin} as pendingAdmin for Unitroller`)

  const setPendingAdmin = await execute('Unitroller', { from: deployer }, '_setPendingAdmin', admin);
  console.log(setPendingAdmin);

  const comptrollerImpl = await deploy('Comptroller_Implementation', {
    from: deployer,
    contract: 'Comptroller',
    log: true
  });

  console.log("Connecting Unitroller and Comptroller Proxies");

  const unitrollerAddress = (await get('Unitroller')).address;
  const comptrollerImplAddress = (await get('Comptroller_Implementation')).address;
  await execute('Unitroller', { from: deployer }, '_setPendingImplementation', comptrollerImplAddress);
  await execute('Comptroller_Implementation', { from: deployer }, '_become', unitrollerAddress);

  // update Comptroller ABI
  await save('Comptroller', {
    abi: comptrollerImpl.abi,
    address: unitrollerAddress
  });

  console.log("Setting Comptroller parameters");

  const comptrollerLens = await deploy('ComptrollerLens', {
    from: deployer,
    log: true
  });
  const closeFactor = parseEther('0.5');
  const liquidationIncentive = parseEther('1.08');
  const priceOracleAddress = (await deployments.get('BraniacPriceOracle')).address;
  const brnAddress = (await deployments.get('BRN')).address;

  await execute('Comptroller', { from: deployer }, '_setBRNTokenAddress', brnAddress);
  await execute('Comptroller', { from: deployer }, '_setCloseFactor', closeFactor);
  await execute('Comptroller', { from: deployer }, '_setLiquidationIncentive', liquidationIncentive);
  await execute('Comptroller', { from: deployer }, '_setPriceOracle', priceOracleAddress);
  await execute('Comptroller', { from: deployer }, '_setComptrollerLens', comptrollerLens.address);
  await execute('Comptroller', { from: deployer }, '_setPauseGuardian', guardian);
  await execute('Comptroller', { from: deployer }, '_setBorrowCapGuardian', guardian);
};

export default func;
func.tags = ['Comptroller','Core'];
func.dependencies = ['BraniacPriceOracle','BRN',];
