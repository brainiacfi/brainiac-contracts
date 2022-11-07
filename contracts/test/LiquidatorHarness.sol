pragma solidity ^0.5.16;

import "../Liquidator.sol";
import "./ComptrollerScenario.sol";

contract LiquidatorHarness is Liquidator {

    constructor(
        address admin_,
        address payable brCkb_,
        address comptroller_,
        address baiController_,
        address treasury_,
        uint256 treasuryPercentMantissa_
    )
        public
        Liquidator(
            admin_,
            brCkb_,
            comptroller_,
            baiController_,
            treasury_,
            treasuryPercentMantissa_
        )
    {}

    event DistributeLiquidationIncentive(uint256 seizeTokensForTreasury, uint256 seizeTokensForLiquidator);


    /// @dev Splits the received brTokens between the liquidator and treasury.
    function distributeLiquidationIncentive(
        BRToken brTokenCollateral,
        uint256 siezedAmount
    ) public returns (uint256 ours, uint256 theirs) {
        (ours, theirs) = super._distributeLiquidationIncentive(brTokenCollateral, siezedAmount);
        emit DistributeLiquidationIncentive(ours, theirs);
        return (ours, theirs);
    }

    /// @dev Computes the amounts that would go to treasury and to the liquidator.
    function splitLiquidationIncentive(uint256 seizedAmount)
        public
        view
        returns (uint256 ours, uint256 theirs)
    {
       return super._splitLiquidationIncentive(seizedAmount);
    }
}
