pragma solidity ^0.5.16;

import "./Utils/IERC20.sol";
import "./Utils/SafeERC20.sol";
import "./Ownable.sol";

/**
 * @dev Contract for treasury all tokens as fee and transfer to governance
 */
contract BRTreasury is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // WithdrawTreasuryERC20 Event
    event WithdrawTreasuryERC20(address tokenAddress, uint256 withdrawAmount, address withdrawAddress);

    // WithdrawTreasuryCKB Event
    event WithdrawTreasuryCKB(uint256 withdrawAmount, address withdrawAddress);

    /**
     * @notice To receive CKB
     */
    function () external payable {}

    /**
    * @notice Withdraw Treasury ERC20 Tokens, Only owner call it
    * @param tokenAddress The address of treasury token
    * @param withdrawAmount The withdraw amount to owner
    * @param withdrawAddress The withdraw address
    */
    function withdrawTreasuryERC20(
      address tokenAddress,
      uint256 withdrawAmount,
      address withdrawAddress
    ) external onlyOwner {
        uint256 actualWithdrawAmount = withdrawAmount;
        // Get Treasury Token Balance
        uint256 treasuryBalance = IERC20(tokenAddress).balanceOf(address(this));

        // Check Withdraw Amount
        if (withdrawAmount > treasuryBalance) {
            // Update actualWithdrawAmount
            actualWithdrawAmount = treasuryBalance;
        }

        // Transfer ERC20 Token to withdrawAddress
        IERC20(tokenAddress).safeTransfer(withdrawAddress, actualWithdrawAmount);

        emit WithdrawTreasuryERC20(tokenAddress, actualWithdrawAmount, withdrawAddress);
    }

    /**
    * @notice Withdraw Treasury CKB, Only owner call it
    * @param withdrawAmount The withdraw amount to owner
    * @param withdrawAddress The withdraw address
    */
    function withdrawTreasuryCKB(
      uint256 withdrawAmount,
      address payable withdrawAddress
    ) external payable onlyOwner {
        uint256 actualWithdrawAmount = withdrawAmount;
        // Get Treasury CKB Balance
        uint256 ckbBalance = address(this).balance;

        // Check Withdraw Amount
        if (withdrawAmount > ckbBalance) {
            // Update actualWithdrawAmount
            actualWithdrawAmount = ckbBalance;
        }
        // Transfer CKB to withdrawAddress
        withdrawAddress.transfer(actualWithdrawAmount);

        emit WithdrawTreasuryCKB(actualWithdrawAmount, withdrawAddress);
    }
}
