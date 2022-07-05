// require("dotenv").config();
// const hre = require("hardhat");
// const ethers = hre.ethers;

// const main = async () => {
//     const { deployments, getNamedAccounts, network } = hre;
//     const { get } = deployments;
//     const { deployer } = await getNamedAccounts();


//     const xvsAddress = (await get("XVS")).address;
//     const vaiAddress = (await get("VAI")).address;

//     const ComptrollerAddress = (await get("Comptroller")).address;
//     const vaiVaultAddress = (await get("VAIVaultProxy")).address;
//     const vaiController = (await get("VAIController")).address;
    
//     const comptrollerContract = await ethers.getContractFactory(
//         "Comptroller"
//     );
//     const comptrollerContractInstance = await comptrollerContract.attach(
//         ComptrollerAddress
//     );
//     const VAIVaultProxyContract = await ethers.getContractFactory("VAIVaultProxy")
//     const VAIVaultProxyContractInstance = await VAIVaultProxyContract.attach(
//         "VAIVaultProxy"
//     );

//     const tx = await VAIVaultProxyContractInstance.vaiVaultImplementation();
//     await tx.wait();
//     console.log(tx)

//     const tx3 = await VAIVaultProxyContractInstance.xvs();
//     console.log(tx3)

//     const tx4 = await VAIVaultProxyContractInstance.vai();
//     console.log(tx4)

//     console.log("market added")
//     const tx2 = await comptrollerContractInstance._setVAIController(vaiController);
//     await tx2.wait();
//     console.log(tx2)
//     console.log("market added")
//     //   const tx2 = await comptrollerContractInstance._setVAIVaultInfo(vaiVaultAddress,);
//     //   console.log(tx2)


// };

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });
