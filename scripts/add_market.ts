// import {HardhatRuntimeEnvironment} from 'hardhat/types';
// import {DeployFunction} from 'hardhat-deploy/types';

// const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
//   const {deployments, getNamedAccounts} = hre;
//   const {deploy, execute, get} = deployments;

//   const {deployer, admin} = await getNamedAccounts();
//   const comptrollerImplementation =  (await get('Comptroller_Implementation')).address
//   const unitrollerAddress =  (await get('Comptroller_Implementation')).address
//   await execute('Unitroller', { from: deployer }, '_setPendingImplementation', comptrollerImplementation );
//   await execute('Comptroller_Implementation', { from: deployer }, '_become',unitrollerAddress );

// };
// export default func;
// func.tags = ['entermarket'];
