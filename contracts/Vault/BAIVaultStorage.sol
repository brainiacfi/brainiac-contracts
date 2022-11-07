pragma solidity ^0.5.16;
import "../Utils/SafeMath.sol";
import "../Utils/IERC20.sol";

contract BAIVaultAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of BAI Vault
    */
    address public baiVaultImplementation;

    /**
    * @notice Pending brains of BAI Vault
    */
    address public pendingBAIVaultImplementation;
}

contract BAIVaultStorage is BAIVaultAdminStorage {
    /// @notice The BRN TOKEN!
    IERC20 public brn;

    /// @notice The BAI TOKEN!
    IERC20 public bai;

    /// @notice Guard variable for re-entrancy checks
    bool internal _notEntered;

    /// @notice BRN balance of vault
    uint256 public brnBalance;

    /// @notice Accumulated BRN per share
    uint256 public accBRNPerShare;

    //// pending rewards awaiting anyone to update
    uint256 public pendingRewards;

    /// @notice Info of each user.
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    // Info of each user that stakes tokens.
    mapping(address => UserInfo) public userInfo;
}
