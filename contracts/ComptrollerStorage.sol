pragma solidity ^0.5.16;

import "./BRToken.sol";
import "./PriceOracle.sol";
import "./BAIControllerInterface.sol";
import "./ComptrollerLensInterface.sol";

contract UnitrollerAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of Unitroller
    */
    address public comptrollerImplementation;

    /**
    * @notice Pending brains of Unitroller
    */
    address public pendingComptrollerImplementation;
}

contract ComptrollerV1Storage is UnitrollerAdminStorage {

    /**
     * @notice Oracle which gives the price of any given asset
     */
    PriceOracle public oracle;

    /**
     * @notice Multiplier used to calculate the maximum repayAmount when liquidating a borrow
     */
    uint public closeFactorMantissa;

    /**
     * @notice Multiplier representing the discount on collateral that a liquidator receives
     */
    uint public liquidationIncentiveMantissa;

    /**
     * @notice Max number of assets a single account can participate in (borrow or use as collateral)
     */
    uint public maxAssets;

    /**
     * @notice Per-account mapping of "assets you are in", capped by maxAssets
     */
    mapping(address => BRToken[]) public accountAssets;

    struct Market {
        /// @notice Whether or not this market is listed
        bool isListed;

        /**
         * @notice Multiplier representing the most one can borrow against their collateral in this market.
         *  For instance, 0.9 to allow borrowing 90% of collateral value.
         *  Must be between 0 and 1, and stored as a mantissa.
         */
        uint collateralFactorMantissa;

        /// @notice Per-market mapping of "accounts in this asset"
        mapping(address => bool) accountMembership;

        /// @notice Whether or not this market receives BRN
        bool isBrainiac;
    }

    /**
     * @notice Official mapping of brTokens -> Market metadata
     * @dev Used e.g. to determine if a market is supported
     */
    mapping(address => Market) public markets;

    /**
     * @notice The Pause Guardian can pause certain actions as a safety mechanism.
     *  Actions which allow users to remove their own assets cannot be paused.
     *  Liquidation / seizing / transfer can only be paused globally, not by market.
     */
    address public pauseGuardian;
    bool public _mintGuardianPaused;
    bool public _borrowGuardianPaused;
    bool public transferGuardianPaused;
    bool public seizeGuardianPaused;
    mapping(address => bool) public mintGuardianPaused;
    mapping(address => bool) public borrowGuardianPaused;

    struct BrainiacMarketState {
        /// @notice The market's last updated brainiacBorrowIndex or brainiacSupplyIndex
        uint224 index;

        /// @notice The block number the index was last updated at
        uint32 block;
    }

    /// @notice A list of all markets
    BRToken[] public allMarkets;

    /// @notice The rate at which the flywheel distributes BRN, per block
    uint public brainiacRate;

    /// @notice The portion of brainiacRate that each market currently receives
    mapping(address => uint) public brainiacSpeeds;

    /// @notice The Brainiac market supply state for each market
    mapping(address => BrainiacMarketState) public brainiacSupplyState;

    /// @notice The Brainiac market borrow state for each market
    mapping(address => BrainiacMarketState) public brainiacBorrowState;

    /// @notice The Brainiac supply index for each market for each supplier as of the last time they accrued BRN
    mapping(address => mapping(address => uint)) public brainiacSupplierIndex;

    /// @notice The Brainiac borrow index for each market for each borrower as of the last time they accrued BRN
    mapping(address => mapping(address => uint)) public brainiacBorrowerIndex;

    /// @notice The BRN accrued but not yet transferred to each user
    mapping(address => uint) public brainiacAccrued;

    /// @notice The Address of BAIController
    BAIControllerInterface public baiController;

    /// @notice The minted BAI amount to each user
    mapping(address => uint) public mintedBAIs;

    /// @notice BAI Mint Rate as a percentage
    uint public baiMintRate;

    /**
     * @notice The Pause Guardian can pause certain actions as a safety mechanism.
     */
    bool public mintBAIGuardianPaused;
    bool public repayBAIGuardianPaused;

    /**
     * @notice Pause/Unpause whole protocol actions
     */
    bool public protocolPaused;

    /// @notice The rate at which the flywheel distributes BRN to BAI Minters, per block
    uint public brainiacBAIRate;
}

contract ComptrollerV2Storage is ComptrollerV1Storage {
    /// @notice The rate at which the flywheel distributes BRN to BAI Vault, per block
    uint public brainiacBAIVaultRate;

    // address of BAI Vault
    address public baiVaultAddress;

    // start block of release to BAI Vault
    uint256 public releaseStartBlock;

    // minimum release amount to BAI Vault
    uint256 public minReleaseAmount;
}

contract ComptrollerV3Storage is ComptrollerV2Storage {
    /// @notice The borrowCapGuardian can set borrowCaps to any number for any market. Lowering the borrow cap could disable borrowing on the given market.
    address public borrowCapGuardian;

    /// @notice Borrow caps enforced by borrowAllowed for each brToken address. Defaults to zero which corresponds to unlimited borrowing.
    mapping(address => uint) public borrowCaps;
}

contract ComptrollerV4Storage is ComptrollerV3Storage {
    /// @notice Treasury Guardian address
    address public treasuryGuardian;

    /// @notice Treasury address
    address public treasuryAddress;

    /// @notice Fee percent of accrued interest with decimal 18
    uint256 public treasuryPercent;
}
contract ComptrollerV5Storage is ComptrollerV4Storage {
    /// @notice The portion of BRN that each contributor receives per block
    mapping(address => uint) public brainiacContributorSpeeds;

    /// @notice Last block at which a contributor's BRN rewards have been allocated
    mapping(address => uint) public lastContributorBlock;
}

contract ComptrollerV6Storage is ComptrollerV5Storage {
    address public liquidatorContract;
}

contract ComptrollerV7Storage is ComptrollerV6Storage {
    ComptrollerLensInterface public comptrollerLens;
    address public brnToken;
    address public brBrnToken;
}
contract ComptrollerV8Storage is ComptrollerV7Storage {
    
    /// @notice Supply caps enforced by mintAllowed for each vToken address. Defaults to zero which corresponds to minting notAllowed
    mapping(address => uint256) public supplyCaps;
}
