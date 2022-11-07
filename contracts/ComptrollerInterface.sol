pragma solidity ^0.5.16;

import "./BRToken.sol";
import "./PriceOracle.sol";

contract ComptrollerInterfaceG1 {
    /// @notice Indicator that this is a Comptroller contract (for inspection)
    bool public constant isComptroller = true;

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata brTokens) external returns (uint[] memory);
    function exitMarket(address brToken) external returns (uint);

    /*** Policy Hooks ***/

    function mintAllowed(address brToken, address minter, uint mintAmount) external returns (uint);
    function mintVerify(address brToken, address minter, uint mintAmount, uint mintTokens) external;

    function redeemAllowed(address brToken, address redeemer, uint redeemTokens) external returns (uint);
    function redeemVerify(address brToken, address redeemer, uint redeemAmount, uint redeemTokens) external;

    function borrowAllowed(address brToken, address borrower, uint borrowAmount) external returns (uint);
    function borrowVerify(address brToken, address borrower, uint borrowAmount) external;

    function repayBorrowAllowed(
        address brToken,
        address payer,
        address borrower,
        uint repayAmount) external returns (uint);
    function repayBorrowVerify(
        address brToken,
        address payer,
        address borrower,
        uint repayAmount,
        uint borrowerIndex) external;

    function liquidateBorrowAllowed(
        address brTokenBorrowed,
        address brTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount) external returns (uint);
    function liquidateBorrowVerify(
        address brTokenBorrowed,
        address brTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount,
        uint seizeTokens) external;

    function seizeAllowed(
        address brTokenCollateral,
        address brTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external returns (uint);
    function seizeVerify(
        address brTokenCollateral,
        address brTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external;

    function transferAllowed(address brToken, address src, address dst, uint transferTokens) external returns (uint);
    function transferVerify(address brToken, address src, address dst, uint transferTokens) external;

    /*** Liquidity/Liquidation Calculations ***/

    function liquidateCalculateSeizeTokens(
        address brTokenBorrowed,
        address brTokenCollateral,
        uint repayAmount) external view returns (uint, uint);
    function setMintedBAIOf(address owner, uint amount) external returns (uint);
}

contract ComptrollerInterfaceG2 is ComptrollerInterfaceG1 {
    function liquidateBAICalculateSeizeTokens(
        address brTokenCollateral,
        uint repayAmount) external view returns (uint, uint);
}

contract ComptrollerInterface is ComptrollerInterfaceG2 {
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (PriceOracle);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (BRToken[] memory);
    function claimBrainiac(address) external;
    function brainiacAccrued(address) external view returns (uint);
    function brainiacSpeeds(address) external view returns (uint);
    function getAllMarkets() external view returns (BRToken[] memory);
    function brainiacSupplierIndex(address, address) external view returns (uint);
    function brainiacInitialIndex() external view returns (uint224);
    function brainiacBorrowerIndex(address, address) external view returns (uint);
    function brainiacBorrowState(address) external view returns (uint224, uint32);
    function brainiacSupplyState(address) external view returns (uint224, uint32);
}

interface IBAIVault {
    function updatePendingRewards() external;
}

interface IComptroller {
    function liquidationIncentiveMantissa() external view returns (uint);
    /*** Treasury Data ***/
    function treasuryAddress() external view returns (address);
    function treasuryPercent() external view returns (uint);
}
