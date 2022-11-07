pragma solidity ^0.5.16;
import "../Utils/SafeERC20.sol";
import "../Utils/IERC20.sol";
import "./BAIVaultProxy.sol";
import "./BAIVaultStorage.sol";
import "./BAIVaultErrorReporter.sol";

contract BAIVault is BAIVaultStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice Event emitted when BAI deposit
    event Deposit(address indexed user, uint256 amount);

    /// @notice Event emitted when BAI withrawal
    event Withdraw(address indexed user, uint256 amount);

    /// @notice Event emitted when admin changed
    event AdminTransfered(address indexed oldAdmin, address indexed newAdmin);

    constructor() public {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can");
        _;
    }

    /*** Reentrancy Guard ***/

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     */
    modifier nonReentrant() {
        require(_notEntered, "re-entered");
        _notEntered = false;
        _;
        _notEntered = true; // get a gas-refund post-Istanbul
    }

    /**
     * @notice Deposit BAI to BAIVault for BRN allocation
     * @param _amount The amount to deposit to vault
     */
    function deposit(uint256 _amount) public nonReentrant {
        UserInfo storage user = userInfo[msg.sender];

        updateVault();

        // Transfer pending tokens to user
        updateAndPayOutPending(msg.sender);

        // Transfer in the amounts from user
        if(_amount > 0) {
            bai.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }

        user.rewardDebt = user.amount.mul(accBRNPerShare).div(1e18);
        emit Deposit(msg.sender, _amount);
    }

    /**
     * @notice Withdraw BAI from BAIVault
     * @param _amount The amount to withdraw from vault
     */
    function withdraw(uint256 _amount) public nonReentrant {
        _withdraw(msg.sender, _amount);
    }

    /**
     * @notice Claim BRN from BAIVault
     */
    function claim() public nonReentrant {
        _withdraw(msg.sender, 0);
    }

    /**
     * @notice Low level withdraw function
     * @param account The account to withdraw from vault
     * @param _amount The amount to withdraw from vault
     */
    function _withdraw(address account, uint256 _amount) internal {
        UserInfo storage user = userInfo[account];
        require(user.amount >= _amount, "withdraw: not good");

        updateVault();
        updateAndPayOutPending(account); // Update balances of account this is not withdrawal but claiming BRN farmed

        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            bai.safeTransfer(address(account), _amount);
        }
        user.rewardDebt = user.amount.mul(accBRNPerShare).div(1e18);

        emit Withdraw(account, _amount);
    }

    /**
     * @notice View function to see pending BRN on frontend
     * @param _user The user to see pending BRN
     */
    function pendingBRN(address _user) public view returns (uint256)
    {
        UserInfo storage user = userInfo[_user];

        return user.amount.mul(accBRNPerShare).div(1e18).sub(user.rewardDebt);
    }

    /**
     * @notice Update and pay out pending BRN to user
     * @param account The user to pay out
     */
    function updateAndPayOutPending(address account) internal {
        uint256 pending = pendingBRN(account);

        if(pending > 0) {
            safeBRNTransfer(account, pending);
        }
    }

    /**
     * @notice Safe BRN transfer function, just in case if rounding error causes pool to not have enough BRN
     * @param _to The address that BRN to be transfered
     * @param _amount The amount that BRN to be transfered
     */
    function safeBRNTransfer(address _to, uint256 _amount) internal {
        uint256 brnBal = brn.balanceOf(address(this));

        if (_amount > brnBal) {
            brn.transfer(_to, brnBal);
            brnBalance = brn.balanceOf(address(this));
        } else {
            brn.transfer(_to, _amount);
            brnBalance = brn.balanceOf(address(this));
        }
    }

    /**
     * @notice Function that updates pending rewards
     */
    function updatePendingRewards() public {
        uint256 newRewards = brn.balanceOf(address(this)).sub(brnBalance);

        if(newRewards > 0) {
            brnBalance = brn.balanceOf(address(this)); // If there is no change the balance didn't change
            pendingRewards = pendingRewards.add(newRewards);
        }
    }

    /**
     * @notice Update reward variables to be up-to-date
     */
    function updateVault() internal {
        uint256 baiBalance = bai.balanceOf(address(this));
        if (baiBalance == 0) { // avoids division by 0 errors
            return;
        }

        accBRNPerShare = accBRNPerShare.add(pendingRewards.mul(1e18).div(baiBalance));
        pendingRewards = 0;
    }

    /**
     * @dev Returns the address of the current admin
     */
    function getAdmin() public view returns (address) {
        return admin;
    }

    /**
     * @dev Burn the current admin
     */
    function burnAdmin() public onlyAdmin {
        emit AdminTransfered(admin, address(0));
        admin = address(0);
    }

    /**
     * @dev Set the current admin to new address
     */
    function setNewAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "new owner is the zero address");
        emit AdminTransfered(admin, newAdmin);
        admin = newAdmin;
    }

    /*** Admin Functions ***/

    function _become(BAIVaultProxy baiVaultProxy) public {
        require(msg.sender == baiVaultProxy.admin(), "only proxy admin can change brains");
        require(baiVaultProxy._acceptImplementation() == 0, "change not authorized");
    }

    function setBrainiacInfo(address _brn, address _bai) public onlyAdmin {
        brn = IERC20(_brn);
        bai = IERC20(_bai);

        _notEntered = true;
    }
}
