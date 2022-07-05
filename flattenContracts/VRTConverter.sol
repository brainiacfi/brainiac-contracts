// Sources flattened with hardhat v2.8.4 https://hardhat.org

// File contracts/Utils/IBEP20.sol

pragma solidity ^0.5.0;

/**
 * @dev Interface of the BEP20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see {BEP20Detailed}.
 */
interface IBEP20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


// File contracts/Utils/SafeMath.sol

pragma solidity ^0.5.0;

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     *
     * _Available since v2.4.0._
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}


// File contracts/Utils/Address.sol

pragma solidity ^0.5.5;

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // According to EIP-1052, 0x0 is the value returned for not-yet created accounts
        // and 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 is returned
        // for accounts without code, i.e. `keccak256('')`
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != accountHash && codehash != 0x0);
    }

    /**
     * @dev Converts an `address` into `address payable`. Note that this is
     * simply a type cast: the actual underlying value is not changed.
     *
     * _Available since v2.4.0._
     */
    function toPayable(address account) internal pure returns (address payable) {
        return address(uint160(account));
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     *
     * _Available since v2.4.0._
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-call-value
        // solium-disable-next-line security/no-call-value
        (bool success, ) = recipient.call.value(amount)("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }
}


// File contracts/Utils/SafeBEP20.sol

pragma solidity ^0.5.0;
/**
 * @title SafeBEP20
 * @dev Wrappers around BEP20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeBEP20 for BEP20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeBEP20 {
    using SafeMath for uint256;
    using Address for address;

    function safeTransfer(IBEP20 token, address to, uint256 value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IBEP20 token, address from, address to, uint256 value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(IBEP20 token, address spender, uint256 value) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        // solhint-disable-next-line max-line-length
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeBEP20: approve from non-zero to non-zero allowance"
        );
        callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(IBEP20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).add(value);
        callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(IBEP20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).sub(value, "SafeBEP20: decreased allowance below zero");
        callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function callOptionalReturn(IBEP20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves.

        // A Solidity high level call has three parts:
        //  1. The target address is checked to verify it contains contract code
        //  2. The call itself is made, and success asserted
        //  3. The return value is decoded, which in turn checks the size of the returned data.
        // solhint-disable-next-line max-line-length
        require(address(token).isContract(), "SafeBEP20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeBEP20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeBEP20: BEP20 operation did not succeed");
        }
    }
}


// File contracts/VRT/IXVSVesting.sol

pragma solidity ^0.5.16;

interface IXVSVesting {

    /// @param _recipient Address of the Vesting. recipient entitled to claim the vested funds
    /// @param _amount Total number of tokens Vested
    function deposit(address _recipient, uint256 _amount) external;
}


// File contracts/VRT/VRTConverterStorage.sol

pragma solidity ^0.5.16;
contract VRTConverterAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of VRTConverter
    */
    address public implementation;

    /**
    * @notice Pending brains of VRTConverter
    */
    address public pendingImplementation;
}

contract VRTConverterStorage is VRTConverterAdminStorage {

    /// @notice Guard variable for re-entrancy checks
    bool public _notEntered;

    /// @notice indicator to check if the contract is initialized
    bool public initialized;

    /// @notice The VRT TOKEN!
    IBEP20 public vrt;

    /// @notice The XVS TOKEN!
    IBEP20 public xvs;

    /// @notice XVSVesting Contract reference
    IXVSVesting public xvsVesting;

    /// @notice Conversion ratio from VRT to XVS with decimal 18
    uint256 public conversionRatio;

    /// @notice total VRT converted to XVS
    uint256 public totalVrtConverted;

    /// @notice Conversion Start time in EpochSeconds
    uint256 public conversionStartTime;

    /// @notice ConversionPeriod in Seconds
    uint256 public conversionPeriod;

    /// @notice Conversion End time in EpochSeconds
    uint256 public conversionEndTime;
}


// File contracts/VRT/VRTConverterProxy.sol

pragma solidity ^0.5.16;
contract VRTConverterProxy is VRTConverterAdminStorage {

    /**
      * @notice Emitted when pendingImplementation is changed
      */
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);

    /**
      * @notice Emitted when pendingImplementation is accepted, which means VRTConverter implementation is updated
      */
    event NewImplementation(address oldImplementation, address newImplementation);

    /**
    * @notice Emitted when pendingAdmin is changed
    */
    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);

    /**
    * @notice Emitted when pendingAdmin is accepted, which means admin is updated
    */
    event NewAdmin(address oldAdmin, address newAdmin);

    constructor(address implementation_,
                address _vrtAddress,
                address _xvsAddress,
                uint256 _conversionRatio,
                uint256 _conversionStartTime,
                uint256 _conversionPeriod) nonZeroAddress(implementation_) nonZeroAddress(_vrtAddress) nonZeroAddress(_xvsAddress) public {
        // Creator of the contract is admin during initialization
        admin = msg.sender;

        // New implementations always get set via the settor (post-initialize)
        _setImplementation(implementation_);

        // First delegate gets to initialize the delegator (i.e. storage contract)
        delegateTo(implementation_, abi.encodeWithSignature("initialize(address,address,uint256,uint256,uint256)",
                                                            _vrtAddress,
                                                            _xvsAddress,
                                                            _conversionRatio,
                                                            _conversionStartTime,
                                                            _conversionPeriod));
    }

    modifier nonZeroAddress(address _address) {
        require(_address != address(0), "Address cannot be Zero");
        _;
    }

    /**
    * @notice Called by the admin to update the implementation of the delegator
    * @param implementation_ The address of the new implementation for delegation
    */
    function _setImplementation(address implementation_) public {
        require(msg.sender == admin, "VRTConverterProxy::_setImplementation: admin only");
        require(implementation_ != address(0), "VRTConverterProxy::_setImplementation: invalid implementation address");

        address oldImplementation = implementation;
        implementation = implementation_;

        emit NewImplementation(oldImplementation, implementation);
    }

    /**
      * @notice Internal method to delegate execution to another contract
      * @dev It returns to the external caller whatever the implementation returns or forwards reverts
      * @param callee The contract to delegatecall
      * @param data The raw data to delegatecall
      * @return The returned bytes from the delegatecall
     */
    function delegateTo(address callee, bytes memory data) internal nonZeroAddress(callee) returns (bytes memory) {
        (bool success, bytes memory returnData) = callee.delegatecall(data);
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize)
            }
        }
        return returnData;
    }

    /*** Admin Functions ***/
    function _setPendingImplementation(address newPendingImplementation) nonZeroAddress(newPendingImplementation) public {

        require(msg.sender == admin, "Only admin can set Pending Implementation");

        address oldPendingImplementation = pendingImplementation;

        pendingImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingImplementation);
    }

    /**
    * @notice Accepts new implementation of VRTConverter. msg.sender must be pendingImplementation
    * @dev Admin function for new implementation to accept it's role as implementation
    * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
    */
    function _acceptImplementation() public {
        // Check caller is pendingImplementation
        require(msg.sender == pendingImplementation, "only address marked as pendingImplementation can accept Implementation");

        // Save current values for inclusion in log
        address oldImplementation = implementation;
        address oldPendingImplementation = pendingImplementation;

        implementation = pendingImplementation;

        pendingImplementation = address(0);

        emit NewImplementation(oldImplementation, implementation);
        emit NewPendingImplementation(oldPendingImplementation, pendingImplementation);
    }


    /**
      * @notice Begins transfer of admin rights. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
      * @dev Admin function to begin change of admin. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
      * @param newPendingAdmin New pending admin.
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setPendingAdmin(address newPendingAdmin) nonZeroAddress(newPendingAdmin) public {
        // Check caller = admin
        require(msg.sender == admin, "only admin can set pending admin");
        require(newPendingAdmin != pendingAdmin , "New pendingAdmin can not be same as the previous one");

        // Save current value, if any, for inclusion in log
        address oldPendingAdmin = pendingAdmin;

        // Store pendingAdmin with value newPendingAdmin
        pendingAdmin = newPendingAdmin;

        // Emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin)
        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
    }

    /**
      * @notice Accepts transfer of admin rights. msg.sender must be pendingAdmin
      * @dev Admin function for pending admin to accept role and update admin
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _acceptAdmin() public {
        // Check caller is pendingAdmin
        require(msg.sender == pendingAdmin, "only address marked as pendingAdmin can accept as Admin");
        
        // Save current values for inclusion in log
        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;

        // Store admin with value pendingAdmin
        admin = pendingAdmin;

        // Clear the pending value
        pendingAdmin = address(0);

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);
    }

    /**
     * @dev Delegates execution to an implementation contract.
     * It returns to the external caller whatever the implementation returns
     * or forwards reverts.
     */
    function () external payable {
        // delegate all other functions to current implementation
        (bool success, ) = implementation.delegatecall(msg.data);

        assembly {
              let free_mem_ptr := mload(0x40)
              returndatacopy(free_mem_ptr, 0, returndatasize)

              switch success
              case 0 { revert(free_mem_ptr, returndatasize) }
              default { return(free_mem_ptr, returndatasize) }
        }
    }
}


// File contracts/VRT/VRTConverter.sol

pragma solidity ^0.5.16;
/**
 * @title Venus's VRTConversion Contract
 * @author Venus
 */
contract VRTConverter is VRTConverterStorage {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice decimal precision for VRT
    uint256 public constant vrtDecimalsMultiplier = 1e18;

    /// @notice decimal precision for XVS
    uint256 public constant xvsDecimalsMultiplier = 1e18;

    /// @notice Emitted when an admin set conversion info
    event ConversionInfoSet(uint256 conversionRatio, uint256 conversionStartTime, uint256 conversionPeriod, uint256 conversionEndTime);

    /// @notice Emitted when token conversion is done
    event TokenConverted(address reedeemer, address vrtAddress, uint256 vrtAmount, address xvsAddress, uint256 xvsAmount);

    /// @notice Emitted when an admin withdraw converted token
    event TokenWithdraw(address token, address to, uint256 amount);

    /// @notice Emitted when XVSVestingAddress is set
    event XVSVestingSet(address xvsVestingAddress);

    constructor() public {}

    function initialize(address _vrtAddress,
                address _xvsAddress,
                uint256 _conversionRatio,
                uint256 _conversionStartTime,
                uint256 _conversionPeriod) public {
        require(msg.sender == admin, "only admin may initialize the VRTConverter");
        require(initialized == false, "VRTConverter is already initialized");

        require(_vrtAddress != address(0), "vrtAddress cannot be Zero");
        vrt = IBEP20(_vrtAddress);
        
        require(_xvsAddress != address(0), "xvsAddress cannot be Zero");
        xvs = IBEP20(_xvsAddress);
        
        require(_conversionRatio > 0, "conversionRatio cannot be Zero");
        conversionRatio = _conversionRatio;

        require(_conversionStartTime >= block.timestamp, "conversionStartTime must be time in the future");
        require(_conversionPeriod > 0, "_conversionPeriod is invalid");

        conversionStartTime = _conversionStartTime;
        conversionPeriod = _conversionPeriod;
        conversionEndTime = conversionStartTime.add(conversionPeriod);
        emit ConversionInfoSet(conversionRatio, conversionStartTime, conversionPeriod, conversionEndTime);
        
        totalVrtConverted = 0;
        _notEntered = true;
        initialized = true;
    }

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
     * @notice sets XVSVestingProxy Address
     * @dev Note: If XVSVestingProxy is not set, then Conversion is not allowed
     * @param _xvsVestingAddress The XVSVestingProxy Address
     */
    function setXVSVesting(address _xvsVestingAddress) public {
        require(msg.sender == admin, "only admin may initialize the Vault");
        require(_xvsVestingAddress != address(0), "xvsVestingAddress cannot be Zero");
        xvsVesting = IXVSVesting(_xvsVestingAddress);
        emit XVSVestingSet(_xvsVestingAddress);
    }

    modifier isInitialized() {
        require(initialized == true, "VRTConverter is not initialized");
        _;
    }

    function isConversionActive() public view returns(bool) {
        uint256 currentTime = block.timestamp;
        if(currentTime >= conversionStartTime && currentTime <= conversionEndTime){
            return true;
        }
        return false;
    }

    modifier checkForActiveConversionPeriod(){
        uint256 currentTime = block.timestamp;
        require(currentTime >= conversionStartTime, "Conversion did not start yet");
        require(currentTime <= conversionEndTime, "Conversion Period Ended");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can");
        _;
    }

    modifier nonZeroAddress(address _address) {
        require(_address != address(0), "Address cannot be Zero");
        _;
    }

    /**
     * @notice Transfer VRT and redeem XVS
     * @dev Note: If there is not enough XVS, we do not perform the conversion.
     * @param vrtAmount The amount of VRT
     */
    function convert(uint256 vrtAmount) external isInitialized checkForActiveConversionPeriod nonReentrant
    {
        require(address(xvsVesting) != address(0) && address(xvsVesting) != DEAD_ADDRESS, "XVS-Vesting Address is not set");
        require(vrtAmount > 0, "VRT amount must be non-zero");
        totalVrtConverted = totalVrtConverted.add(vrtAmount);

        uint256 redeemAmount = vrtAmount
            .mul(conversionRatio)
            .mul(xvsDecimalsMultiplier)
            .div(1e18)
            .div(vrtDecimalsMultiplier);

        emit TokenConverted(msg.sender, address(vrt), vrtAmount, address(xvs), redeemAmount);
        vrt.safeTransferFrom(msg.sender, DEAD_ADDRESS, vrtAmount);
        xvsVesting.deposit(msg.sender, redeemAmount);
    }

    /*** Admin Functions ***/
    function _become(VRTConverterProxy vrtConverterProxy) public {
        require(msg.sender == vrtConverterProxy.admin(), "only proxy admin can change brains");
        vrtConverterProxy._acceptImplementation();
    }
}
