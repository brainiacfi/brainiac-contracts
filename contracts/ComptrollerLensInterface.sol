pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./BRToken.sol";

interface ComptrollerLensInterface {
    function liquidateCalculateSeizeTokens(
        address comptroller, 
        address brTokenBorrowed, 
        address brTokenCollateral, 
        uint actualRepayAmount
    ) external view returns (uint, uint);
    function liquidateBAICalculateSeizeTokens(
        address comptroller,
        address brTokenCollateral, 
        uint actualRepayAmount
    ) external view returns (uint, uint);
    function getHypotheticalAccountLiquidity(
        address comptroller,
        address account,
        BRToken brTokenModify,
        uint redeemTokens,
        uint borrowAmount) external view returns (uint, uint, uint);
}
