pragma solidity ^0.5.16;

import "./ComptrollerInterface.sol";
import "./BAIControllerInterface.sol";
import "./BRCKB.sol";
import "./BRErc20.sol";
import "./Utils/ReentrancyGuard.sol";
import "./Utils/WithAdmin.sol";
import "./Utils/SafeMath.sol";
import "./Utils/IERC20.sol";
import "./Utils/SafeERC20.sol";

contract Liquidator is WithAdmin, ReentrancyGuard {

    /// @notice Address of brCKB contract.
    BRCKB public brCkb;

    /// @notice Address of Brainiac Unitroller contract.
    IComptroller comptroller;

    /// @notice Address of BAIUnitroller contract.
    BAIControllerInterface baiController;

    /// @notice Address of Brainiac Treasury.
    address public treasury;

    /// @notice Percent of seized amount that goes to treasury.
    uint256 public treasuryPercentMantissa;

    /// @notice Emitted when once changes the percent of the seized amount
    ///         that goes to treasury.
    event NewLiquidationTreasuryPercent(uint256 oldPercent, uint256 newPercent);

    /// @notice Event emitted when a borrow is liquidated
    event LiquidateBorrowedTokens(address liquidator, address borrower, uint256 repayAmount, address brTokenCollateral, uint256 seizeTokensForTreasury, uint256 seizeTokensForLiquidator);

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    constructor(
        address admin_,
        address payable brCkb_,
        address comptroller_,
        address baiController_,
        address treasury_,
        uint256 treasuryPercentMantissa_
    )
        public
        WithAdmin(admin_)
        ReentrancyGuard()
    {
        ensureNonzeroAddress(admin_);
        // ensureNonzeroAddress(brCkb_);
        ensureNonzeroAddress(comptroller_);
        // ensureNonzeroAddress(baiController_);
        ensureNonzeroAddress(treasury_);
        brCkb = BRCKB(brCkb_);
        comptroller = IComptroller(comptroller_);
        baiController = BAIControllerInterface(baiController_);
        treasury = treasury_;
        treasuryPercentMantissa = treasuryPercentMantissa_;
    }

    /// @notice Liquidates a borrow and splits the seized amount between treasury and
    ///         liquidator. The liquidators should use this interface instead of calling
    ///         brToken.liquidateBorrow(...) directly.
    /// @dev For CKB borrows msg.value should be equal to repayAmount; otherwise msg.value
    ///      should be zero.
    /// @param brToken Borrowed brToken
    /// @param borrower The address of the borrower
    /// @param repayAmount The amount to repay on behalf of the borrower
    /// @param brTokenCollateral The collateral to seize
    function liquidateBorrow(
        address brToken,
        address borrower,
        uint256 repayAmount,
        BRToken brTokenCollateral
    )
        external
        payable
        nonReentrant
    {
        ensureNonzeroAddress(borrower);
        uint256 ourBalanceBefore = brTokenCollateral.balanceOf(address(this));
            require(msg.value == 0, "you shouldn't pay for this");
            if (brToken == address(baiController)) {
                _liquidateBAI(borrower, repayAmount, brTokenCollateral);
            } else {
                _liquidateErc20(BRErc20(brToken), borrower, repayAmount, brTokenCollateral);
            }
        uint256 ourBalanceAfter = brTokenCollateral.balanceOf(address(this));
        uint256 seizedAmount = ourBalanceAfter.sub(ourBalanceBefore);
        (uint256 ours, uint256 theirs) = _distributeLiquidationIncentive(brTokenCollateral, seizedAmount);
        emit LiquidateBorrowedTokens(msg.sender, borrower, repayAmount, address(brTokenCollateral), ours, theirs);
    }

    /// @notice Sets the new percent of the seized amount that goes to treasury. Should
    ///         be less than or equal to comptroller.liquidationIncentiveMantissa().sub(1e18).
    /// @param newTreasuryPercentMantissa New treasury percent (scaled by 10^18).
    function setTreasuryPercent(uint256 newTreasuryPercentMantissa) external onlyAdmin {
        require(
            newTreasuryPercentMantissa <= comptroller.liquidationIncentiveMantissa().sub(1e18),
            "appetite too big"
        );
        emit NewLiquidationTreasuryPercent(treasuryPercentMantissa, newTreasuryPercentMantissa);
        treasuryPercentMantissa = newTreasuryPercentMantissa;
    }

    /// @dev Transfers ERC20 tokens to self, then approves brToken to take these tokens.
    function _liquidateErc20(
        BRErc20 brToken,
        address borrower,
        uint256 repayAmount,
        BRToken brTokenCollateral
    )
        internal
    {
        IERC20 borrowedToken = IERC20(brToken.underlying());
        uint256 actualRepayAmount = _transferErc20(borrowedToken, msg.sender, address(this), repayAmount);
        borrowedToken.safeApprove(address(brToken), 0);
        borrowedToken.safeApprove(address(brToken), actualRepayAmount);
        requireNoError(
            brToken.liquidateBorrow(borrower, actualRepayAmount, brTokenCollateral),
            "failed to liquidate"
        );
    }

    /// @dev Transfers ERC20 tokens to self, then approves bai to take these tokens.
    function _liquidateBAI(address borrower, uint256 repayAmount, BRToken brTokenCollateral)
        internal
    {
        IERC20 bai = IERC20(baiController.getBAIAddress());
        bai.safeTransferFrom(msg.sender, address(this), repayAmount);
        bai.safeApprove(address(baiController), repayAmount);

        (uint err,) = baiController.liquidateBAI(borrower, repayAmount, brTokenCollateral);
        requireNoError(err, "failed to liquidate");
    }

    /// @dev Splits the received brTokens between the liquidator and treasury.
    function _distributeLiquidationIncentive(BRToken brTokenCollateral, uint256 siezedAmount)
        internal returns (uint256 ours, uint256 theirs)
    {
        (ours, theirs) = _splitLiquidationIncentive(siezedAmount);
        require(
            brTokenCollateral.transfer(msg.sender, theirs),
            "failed to transfer to liquidator"
        );
        require(
            brTokenCollateral.transfer(treasury, ours),
            "failed to transfer to treasury"
        );
        return (ours, theirs);
    }

    /// @dev Transfers tokens and returns the actual transfer amount
    function _transferErc20(IERC20 token, address from, address to, uint256 amount)
        internal
        returns (uint256 actualAmount)
    {
        uint256 prevBalance = token.balanceOf(to);
        token.safeTransferFrom(from, to, amount);
        return token.balanceOf(to).sub(prevBalance);
    }

    /// @dev Computes the amounts that would go to treasury and to the liquidator.
    function _splitLiquidationIncentive(uint256 seizedAmount)
        internal
        view
        returns (uint256 ours, uint256 theirs)
    {
        uint256 totalIncentive = comptroller.liquidationIncentiveMantissa();
        uint256 seizedForRepayment = seizedAmount.mul(1e18).div(totalIncentive);
        ours = seizedForRepayment.mul(treasuryPercentMantissa).div(1e18);
        theirs = seizedAmount.sub(ours);
        return (ours, theirs);
    }

    function requireNoError(uint errCode, string memory message) internal pure {
        if (errCode == uint(0)) {
            return;
        }

        bytes memory fullMessage = new bytes(bytes(message).length + 5);
        uint i;

        for (i = 0; i < bytes(message).length; i++) {
            fullMessage[i] = bytes(message)[i];
        }

        fullMessage[i+0] = byte(uint8(32));
        fullMessage[i+1] = byte(uint8(40));
        fullMessage[i+2] = byte(uint8(48 + ( errCode / 10 )));
        fullMessage[i+3] = byte(uint8(48 + ( errCode % 10 )));
        fullMessage[i+4] = byte(uint8(41));

        revert(string(fullMessage));
    }

    function ensureNonzeroAddress(address addr) internal pure {
        require(addr != address(0), "address should be nonzero");
    }
}