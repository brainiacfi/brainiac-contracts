pragma solidity ^0.5.16;

import "./BRToken.sol";
import "./ErrorReporter.sol";
import "./Exponential.sol";
import "./PriceOracle.sol";
import "./ComptrollerInterface.sol";
import "./ComptrollerStorage.sol";
import "./Unitroller.sol";
import "./Governance/BRN.sol";
import "./BAI/BAI.sol";

/**
 * @title Brainiac's Comptroller Contract
 * @author Brainiac
 */
contract ComptrollerG2 is ComptrollerV1Storage, ComptrollerInterfaceG1, ComptrollerErrorReporter, Exponential {
    /// @notice Emitted when an admin supports a market
    event MarketListed(BRToken brToken);

    /// @notice Emitted when an account enters a market
    event MarketEntered(BRToken brToken, address account);

    /// @notice Emitted when an account exits a market
    event MarketExited(BRToken brToken, address account);

    /// @notice Emitted when close factor is changed by admin
    event NewCloseFactor(uint oldCloseFactorMantissa, uint newCloseFactorMantissa);

    /// @notice Emitted when a collateral factor is changed by admin
    event NewCollateralFactor(BRToken brToken, uint oldCollateralFactorMantissa, uint newCollateralFactorMantissa);

    /// @notice Emitted when liquidation incentive is changed by admin
    event NewLiquidationIncentive(uint oldLiquidationIncentiveMantissa, uint newLiquidationIncentiveMantissa);

    /// @notice Emitted when maxAssets is changed by admin
    event NewMaxAssets(uint oldMaxAssets, uint newMaxAssets);

    /// @notice Emitted when price oracle is changed
    event NewPriceOracle(PriceOracle oldPriceOracle, PriceOracle newPriceOracle);

    /// @notice Emitted when pause guardian is changed
    event NewPauseGuardian(address oldPauseGuardian, address newPauseGuardian);

    /// @notice Emitted when an action is paused globally
    event ActionPaused(string action, bool pauseState);

    /// @notice Emitted when an action is paused on a market
    event ActionPaused(BRToken brToken, string action, bool pauseState);

    /// @notice Emitted when market brainiac status is changed
    event MarketBrainiac(BRToken brToken, bool isBrainiac);

    /// @notice Emitted when Brainiac rate is changed
    event NewBrainiacRate(uint oldBrainiacRate, uint newBrainiacRate);

    /// @notice Emitted when Brainiac BAI rate is changed
    event NewBrainiacBAIRate(uint oldBrainiacBAIRate, uint newBrainiacBAIRate);

    /// @notice Emitted when a new Brainiac speed is calculated for a market
    event BrainiacSpeedUpdated(BRToken indexed brToken, uint newSpeed);

    /// @notice Emitted when BRN is distributed to a supplier
    event DistributedSupplierBrainiac(BRToken indexed brToken, address indexed supplier, uint brainiacDelta, uint brainiacSupplyIndex);

    /// @notice Emitted when BRN is distributed to a borrower
    event DistributedBorrowerBrainiac(BRToken indexed brToken, address indexed borrower, uint brainiacDelta, uint brainiacBorrowIndex);

    /// @notice Emitted when BRN is distributed to a BAI minter
    event DistributedBAIMinterBrainiac(address indexed baiMinter, uint brainiacDelta, uint brainiacBAIMintIndex);

    /// @notice Emitted when BAIController is changed
    event NewBAIController(BAIControllerInterface oldBAIController, BAIControllerInterface newBAIController);

    /// @notice Emitted when BAI mint rate is changed by admin
    event NewBAIMintRate(uint oldBAIMintRate, uint newBAIMintRate);

    /// @notice Emitted when protocol state is changed by admin
    event ActionProtocolPaused(bool state);

    /// @notice The threshold above which the flywheel transfers BRN, in wei
    uint public constant brainiacClaimThreshold = 0.001e18;

    /// @notice The initial Brainiac index for a market
    uint224 public constant brainiacInitialIndex = 1e36;

    // closeFactorMantissa must be strictly greater than this value
    uint internal constant closeFactorMinMantissa = 0.05e18; // 0.05

    // closeFactorMantissa must not exceed this value
    uint internal constant closeFactorMaxMantissa = 0.9e18; // 0.9

    // No collateralFactorMantissa may exceed this value
    uint internal constant collateralFactorMaxMantissa = 0.9e18; // 0.9

    // liquidationIncentiveMantissa must be no less than this value
    uint internal constant liquidationIncentiveMinMantissa = 1.0e18; // 1.0

    // liquidationIncentiveMantissa must be no greater than this value
    uint internal constant liquidationIncentiveMaxMantissa = 1.5e18; // 1.5

    constructor() public {
        admin = msg.sender;
    }

    modifier onlyProtocolAllowed {
        require(!protocolPaused, "protocol is paused");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can");
        _;
    }

    modifier onlyListedMarket(BRToken brToken) {
        require(markets[address(brToken)].isListed, "brainiac market is not listed");
        _;
    }

    modifier validPauseState(bool state) {
        require(msg.sender == pauseGuardian || msg.sender == admin, "only pause guardian and admin can");
        require(msg.sender == admin || state == true, "only admin can unpause");
        _;
    }

    /*** Assets You Are In ***/

    /**
     * @notice Returns the assets an account has entered
     * @param account The address of the account to pull assets for
     * @return A dynamic list with the assets the account has entered
     */
    function getAssetsIn(address account) external view returns (BRToken[] memory) {
        return accountAssets[account];
    }

    /**
     * @notice Returns whether the given account is entered in the given asset
     * @param account The address of the account to check
     * @param brToken The brToken to check
     * @return True if the account is in the asset, otherwise false.
     */
    function checkMembership(address account, BRToken brToken) external view returns (bool) {
        return markets[address(brToken)].accountMembership[account];
    }

    /**
     * @notice Add assets to be included in account liquidity calculation
     * @param brTokens The list of addresses of the brToken markets to be enabled
     * @return Success indicator for whether each corresponding market was entered
     */
    function enterMarkets(address[] calldata brTokens) external returns (uint[] memory) {
        uint len = brTokens.length;

        uint[] memory results = new uint[](len);
        for (uint i = 0; i < len; i++) {
            results[i] = uint(addToMarketInternal(BRToken(brTokens[i]), msg.sender));
        }

        return results;
    }

    /**
     * @notice Add the market to the borrower's "assets in" for liquidity calculations
     * @param brToken The market to enter
     * @param borrower The address of the account to modify
     * @return Success indicator for whether the market was entered
     */
    function addToMarketInternal(BRToken brToken, address borrower) internal returns (Error) {
        Market storage marketToJoin = markets[address(brToken)];

        if (!marketToJoin.isListed) {
            // market is not listed, cannot join
            return Error.MARKET_NOT_LISTED;
        }

        if (marketToJoin.accountMembership[borrower]) {
            // already joined
            return Error.NO_ERROR;
        }

        if (accountAssets[borrower].length >= maxAssets)  {
            // no space, cannot join
            return Error.TOO_MANY_ASSETS;
        }

        // survived the gauntlet, add to list
        // NOTE: we store these somewhat redundantly as a significant optimization
        //  this avoids having to iterate through the list for the most common use cases
        //  that is, only when we need to perform liquidity checks
        //  and not whenever we want to check if an account is in a particular market
        marketToJoin.accountMembership[borrower] = true;
        accountAssets[borrower].push(brToken);

        emit MarketEntered(brToken, borrower);

        return Error.NO_ERROR;
    }

    /**
     * @notice Removes asset from sender's account liquidity calculation
     * @dev Sender must not have an outstanding borrow balance in the asset,
     *  or be providing necessary collateral for an outstanding borrow.
     * @param brTokenAddress The address of the asset to be removed
     * @return Whether or not the account successfully exited the market
     */
    function exitMarket(address brTokenAddress) external returns (uint) {
        BRToken brToken = BRToken(brTokenAddress);
        /* Get sender tokensHeld and amountOwed underlying from the brToken */
        (uint oErr, uint tokensHeld, uint amountOwed, ) = brToken.getAccountSnapshot(msg.sender);
        require(oErr == 0, "getAccountSnapshot failed"); // semi-opaque error code

        /* Fail if the sender has a borrow balance */
        if (amountOwed != 0) {
            return fail(Error.NONZERO_BORROW_BALANCE, FailureInfo.EXIT_MARKET_BALANCE_OWED);
        }

        /* Fail if the sender is not permitted to redeem all of their tokens */
        uint allowed = redeemAllowedInternal(brTokenAddress, msg.sender, tokensHeld);
        if (allowed != 0) {
            return failOpaque(Error.REJECTION, FailureInfo.EXIT_MARKET_REJECTION, allowed);
        }

        Market storage marketToExit = markets[address(brToken)];

        /* Return true if the sender is not already ‘in’ the market */
        if (!marketToExit.accountMembership[msg.sender]) {
            return uint(Error.NO_ERROR);
        }

        /* Set brToken account membership to false */
        delete marketToExit.accountMembership[msg.sender];

        /* Delete brToken from the account’s list of assets */
        // In order to delete brToken, copy last item in list to location of item to be removed, reduce length by 1
        BRToken[] storage userAssetList = accountAssets[msg.sender];
        uint len = userAssetList.length;
        uint i;
        for (; i < len; i++) {
            if (userAssetList[i] == brToken) {
                userAssetList[i] = userAssetList[len - 1];
                userAssetList.length--;
                break;
            }
        }

        // We *must* have found the asset in the list or our redundant data structure is broken
        assert(i < len);

        emit MarketExited(brToken, msg.sender);

        return uint(Error.NO_ERROR);
    }

    /*** Policy Hooks ***/

    /**
     * @notice Checks if the account should be allowed to mint tokens in the given market
     * @param brToken The market to verify the mint against
     * @param minter The account which would get the minted tokens
     * @param mintAmount The amount of underlying being supplied to the market in exchange for tokens
     * @return 0 if the mint is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function mintAllowed(address brToken, address minter, uint mintAmount) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!mintGuardianPaused[brToken], "mint is paused");

        // Shh - currently unused
        mintAmount;

        if (!markets[brToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // Keep the flywheel moving
        updateBrainiacSupplyIndex(brToken);
        distributeSupplierBrainiac(brToken, minter, false);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates mint and reverts on rejection. May emit logs.
     * @param brToken Asset being minted
     * @param minter The address minting the tokens
     * @param actualMintAmount The amount of the underlying asset being minted
     * @param mintTokens The number of tokens being minted
     */
    function mintVerify(address brToken, address minter, uint actualMintAmount, uint mintTokens) external {
        // Shh - currently unused
        brToken;
        minter;
        actualMintAmount;
        mintTokens;
    }

    /**
     * @notice Checks if the account should be allowed to redeem tokens in the given market
     * @param brToken The market to verify the redeem against
     * @param redeemer The account which would redeem the tokens
     * @param redeemTokens The number of brTokens to exchange for the underlying asset in the market
     * @return 0 if the redeem is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function redeemAllowed(address brToken, address redeemer, uint redeemTokens) external onlyProtocolAllowed returns (uint) {
        uint allowed = redeemAllowedInternal(brToken, redeemer, redeemTokens);
        if (allowed != uint(Error.NO_ERROR)) {
            return allowed;
        }

        // Keep the flywheel moving
        updateBrainiacSupplyIndex(brToken);
        distributeSupplierBrainiac(brToken, redeemer, false);

        return uint(Error.NO_ERROR);
    }

    function redeemAllowedInternal(address brToken, address redeemer, uint redeemTokens) internal view returns (uint) {
        if (!markets[brToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        /* If the redeemer is not 'in' the market, then we can bypass the liquidity check */
        if (!markets[brToken].accountMembership[redeemer]) {
            return uint(Error.NO_ERROR);
        }

        /* Otherwise, perform a hypothetical liquidity check to guard against shortfall */
        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(redeemer, BRToken(brToken), redeemTokens, 0);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall != 0) {
            return uint(Error.INSUFFICIENT_LIQUIDITY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates redeem and reverts on rejection. May emit logs.
     * @param brToken Asset being redeemed
     * @param redeemer The address redeeming the tokens
     * @param redeemAmount The amount of the underlying asset being redeemed
     * @param redeemTokens The number of tokens being redeemed
     */
    function redeemVerify(address brToken, address redeemer, uint redeemAmount, uint redeemTokens) external {
        // Shh - currently unused
        brToken;
        redeemer;

        // Require tokens is zero or amount is also zero
        require(redeemTokens != 0 || redeemAmount == 0, "redeemTokens zero");
    }

    /**
     * @notice Checks if the account should be allowed to borrow the underlying asset of the given market
     * @param brToken The market to verify the borrow against
     * @param borrower The account which would borrow the asset
     * @param borrowAmount The amount of underlying the account would borrow
     * @return 0 if the borrow is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function borrowAllowed(address brToken, address borrower, uint borrowAmount) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!borrowGuardianPaused[brToken], "borrow is paused");

        if (!markets[brToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        if (!markets[brToken].accountMembership[borrower]) {
            // only brTokens may call borrowAllowed if borrower not in market
            require(msg.sender == brToken, "sender must be brToken");

            // attempt to add borrower to the market
            Error err = addToMarketInternal(BRToken(brToken), borrower);
            if (err != Error.NO_ERROR) {
                return uint(err);
            }
        }

        if (oracle.getUnderlyingPrice(BRToken(brToken)) == 0) {
            return uint(Error.PRICE_ERROR);
        }

        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(borrower, BRToken(brToken), 0, borrowAmount);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall != 0) {
            return uint(Error.INSUFFICIENT_LIQUIDITY);
        }

        // Keep the flywheel moving
        Exp memory borrowIndex = Exp({mantissa: BRToken(brToken).borrowIndex()});
        updateBrainiacBorrowIndex(brToken, borrowIndex);
        distributeBorrowerBrainiac(brToken, borrower, borrowIndex, false);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates borrow and reverts on rejection. May emit logs.
     * @param brToken Asset whose underlying is being borrowed
     * @param borrower The address borrowing the underlying
     * @param borrowAmount The amount of the underlying asset requested to borrow
     */
    function borrowVerify(address brToken, address borrower, uint borrowAmount) external {
        // Shh - currently unused
        brToken;
        borrower;
        borrowAmount;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the account should be allowed to repay a borrow in the given market
     * @param brToken The market to verify the repay against
     * @param payer The account which would repay the asset
     * @param borrower The account which would repay the asset
     * @param repayAmount The amount of the underlying asset the account would repay
     * @return 0 if the repay is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function repayBorrowAllowed(
        address brToken,
        address payer,
        address borrower,
        uint repayAmount) external onlyProtocolAllowed returns (uint) {
        // Shh - currently unused
        payer;
        borrower;
        repayAmount;

        if (!markets[brToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // Keep the flywheel moving
        Exp memory borrowIndex = Exp({mantissa: BRToken(brToken).borrowIndex()});
        updateBrainiacBorrowIndex(brToken, borrowIndex);
        distributeBorrowerBrainiac(brToken, borrower, borrowIndex, false);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates repayBorrow and reverts on rejection. May emit logs.
     * @param brToken Asset being repaid
     * @param payer The address repaying the borrow
     * @param borrower The address of the borrower
     * @param actualRepayAmount The amount of underlying being repaid
     */
    function repayBorrowVerify(
        address brToken,
        address payer,
        address borrower,
        uint actualRepayAmount,
        uint borrowerIndex) external {
        // Shh - currently unused
        brToken;
        payer;
        borrower;
        actualRepayAmount;
        borrowerIndex;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the liquidation should be allowed to occur
     * @param brTokenBorrowed Asset which was borrowed by the borrower
     * @param brTokenCollateral Asset which was used as collateral and will be seized
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param repayAmount The amount of underlying being repaid
     */
    function liquidateBorrowAllowed(
        address brTokenBorrowed,
        address brTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount) external onlyProtocolAllowed returns (uint) {
        // Shh - currently unused
        liquidator;

        if (!markets[brTokenBorrowed].isListed || !markets[brTokenCollateral].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        /* The borrower must have shortfall in order to be liquidatable */
        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(borrower, BRToken(0), 0, 0);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall == 0) {
            return uint(Error.INSUFFICIENT_SHORTFALL);
        }

        /* The liquidator may not repay more than what is allowed by the closeFactor */
        uint borrowBalance = BRToken(brTokenBorrowed).borrowBalanceStored(borrower);
        (MathError mathErr, uint maxClose) = mulScalarTruncate(Exp({mantissa: closeFactorMantissa}), borrowBalance);
        if (mathErr != MathError.NO_ERROR) {
            return uint(Error.MATH_ERROR);
        }
        if (repayAmount > maxClose) {
            return uint(Error.TOO_MUCH_REPAY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates liquidateBorrow and reverts on rejection. May emit logs.
     * @param brTokenBorrowed Asset which was borrowed by the borrower
     * @param brTokenCollateral Asset which was used as collateral and will be seized
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param actualRepayAmount The amount of underlying being repaid
     */
    function liquidateBorrowVerify(
        address brTokenBorrowed,
        address brTokenCollateral,
        address liquidator,
        address borrower,
        uint actualRepayAmount,
        uint seizeTokens) external {
        // Shh - currently unused
        brTokenBorrowed;
        brTokenCollateral;
        liquidator;
        borrower;
        actualRepayAmount;
        seizeTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the seizing of assets should be allowed to occur
     * @param brTokenCollateral Asset which was used as collateral and will be seized
     * @param brTokenBorrowed Asset which was borrowed by the borrower
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param seizeTokens The number of collateral tokens to seize
     */
    function seizeAllowed(
        address brTokenCollateral,
        address brTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!seizeGuardianPaused, "seize is paused");

        // Shh - currently unused
        seizeTokens;

        if (!markets[brTokenCollateral].isListed || !markets[brTokenBorrowed].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        if (BRToken(brTokenCollateral).comptroller() != BRToken(brTokenBorrowed).comptroller()) {
            return uint(Error.COMPTROLLER_MISMATCH);
        }

        // Keep the flywheel moving
        updateBrainiacSupplyIndex(brTokenCollateral);
        distributeSupplierBrainiac(brTokenCollateral, borrower, false);
        distributeSupplierBrainiac(brTokenCollateral, liquidator, false);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates seize and reverts on rejection. May emit logs.
     * @param brTokenCollateral Asset which was used as collateral and will be seized
     * @param brTokenBorrowed Asset which was borrowed by the borrower
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param seizeTokens The number of collateral tokens to seize
     */
    function seizeVerify(
        address brTokenCollateral,
        address brTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external {
        // Shh - currently unused
        brTokenCollateral;
        brTokenBorrowed;
        liquidator;
        borrower;
        seizeTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the account should be allowed to transfer tokens in the given market
     * @param brToken The market to verify the transfer against
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     * @param transferTokens The number of brTokens to transfer
     * @return 0 if the transfer is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function transferAllowed(address brToken, address src, address dst, uint transferTokens) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!transferGuardianPaused, "transfer is paused");

        // Currently the only consideration is whether or not
        //  the src is allowed to redeem this many tokens
        uint allowed = redeemAllowedInternal(brToken, src, transferTokens);
        if (allowed != uint(Error.NO_ERROR)) {
            return allowed;
        }

        // Keep the flywheel moving
        updateBrainiacSupplyIndex(brToken);
        distributeSupplierBrainiac(brToken, src, false);
        distributeSupplierBrainiac(brToken, dst, false);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates transfer and reverts on rejection. May emit logs.
     * @param brToken Asset being transferred
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     * @param transferTokens The number of brTokens to transfer
     */
    function transferVerify(address brToken, address src, address dst, uint transferTokens) external {
        // Shh - currently unused
        brToken;
        src;
        dst;
        transferTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /*** Liquidity/Liquidation Calculations ***/

    /**
     * @dev Local vars for avoiding stack-depth limits in calculating account liquidity.
     *  Note that `brTokenBalance` is the number of brTokens the account owns in the market,
     *  whereas `borrowBalance` is the amount of underlying that the account has borrowed.
     */
    struct AccountLiquidityLocalVars {
        uint sumCollateral;
        uint sumBorrowPlusEffects;
        uint brTokenBalance;
        uint borrowBalance;
        uint exchangeRateMantissa;
        uint oraclePriceMantissa;
        Exp collateralFactor;
        Exp exchangeRate;
        Exp oraclePrice;
        Exp tokensToDenom;
    }

    /**
     * @notice Determine the current account liquidity wrt collateral requirements
     * @return (possible error code (semi-opaque),
                account liquidity in excess of collateral requirements,
     *          account shortfall below collateral requirements)
     */
    function getAccountLiquidity(address account) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidityInternal(account, BRToken(0), 0, 0);

        return (uint(err), liquidity, shortfall);
    }

    /**
     * @notice Determine what the account liquidity would be if the given amounts were redeemed/borrowed
     * @param brTokenModify The market to hypothetically redeem/borrow in
     * @param account The account to determine liquidity for
     * @param redeemTokens The number of tokens to hypothetically redeem
     * @param borrowAmount The amount of underlying to hypothetically borrow
     * @return (possible error code (semi-opaque),
                hypothetical account liquidity in excess of collateral requirements,
     *          hypothetical account shortfall below collateral requirements)
     */
    function getHypotheticalAccountLiquidity(
        address account,
        address brTokenModify,
        uint redeemTokens,
        uint borrowAmount) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidityInternal(account, BRToken(brTokenModify), redeemTokens, borrowAmount);
        return (uint(err), liquidity, shortfall);
    }

    /**
     * @notice Determine what the account liquidity would be if the given amounts were redeemed/borrowed
     * @param brTokenModify The market to hypothetically redeem/borrow in
     * @param account The account to determine liquidity for
     * @param redeemTokens The number of tokens to hypothetically redeem
     * @param borrowAmount The amount of underlying to hypothetically borrow
     * @dev Note that we calculate the exchangeRateStored for each collateral brToken using stored data,
     *  without calculating accumulated interest.
     * @return (possible error code,
                hypothetical account liquidity in excess of collateral requirements,
     *          hypothetical account shortfall below collateral requirements)
     */
    function getHypotheticalAccountLiquidityInternal(
        address account,
        BRToken brTokenModify,
        uint redeemTokens,
        uint borrowAmount) internal view returns (Error, uint, uint) {

        AccountLiquidityLocalVars memory vars; // Holds all our calculation results
        uint oErr;
        MathError mErr;

        // For each asset the account is in
        BRToken[] memory assets = accountAssets[account];
        for (uint i = 0; i < assets.length; i++) {
            BRToken asset = assets[i];

            // Read the balances and exchange rate from the brToken
            (oErr, vars.brTokenBalance, vars.borrowBalance, vars.exchangeRateMantissa) = asset.getAccountSnapshot(account);
            if (oErr != 0) { // semi-opaque error code, we assume NO_ERROR == 0 is invariant between upgrades
                return (Error.SNAPSHOT_ERROR, 0, 0);
            }
            vars.collateralFactor = Exp({mantissa: markets[address(asset)].collateralFactorMantissa});
            vars.exchangeRate = Exp({mantissa: vars.exchangeRateMantissa});

            // Get the normalized price of the asset
            vars.oraclePriceMantissa = oracle.getUnderlyingPrice(asset);
            if (vars.oraclePriceMantissa == 0) {
                return (Error.PRICE_ERROR, 0, 0);
            }
            vars.oraclePrice = Exp({mantissa: vars.oraclePriceMantissa});

            // Pre-compute a conversion factor from tokens -> ckb (normalized price value)
            (mErr, vars.tokensToDenom) = mulExp3(vars.collateralFactor, vars.exchangeRate, vars.oraclePrice);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0, 0);
            }

            // sumCollateral += tokensToDenom * brTokenBalance
            (mErr, vars.sumCollateral) = mulScalarTruncateAddUInt(vars.tokensToDenom, vars.brTokenBalance, vars.sumCollateral);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0, 0);
            }

            // sumBorrowPlusEffects += oraclePrice * borrowBalance
            (mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(vars.oraclePrice, vars.borrowBalance, vars.sumBorrowPlusEffects);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0, 0);
            }

            // Calculate effects of interacting with brTokenModify
            if (asset == brTokenModify) {
                // redeem effect
                // sumBorrowPlusEffects += tokensToDenom * redeemTokens
                (mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(vars.tokensToDenom, redeemTokens, vars.sumBorrowPlusEffects);
                if (mErr != MathError.NO_ERROR) {
                    return (Error.MATH_ERROR, 0, 0);
                }

                // borrow effect
                // sumBorrowPlusEffects += oraclePrice * borrowAmount
                (mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(vars.oraclePrice, borrowAmount, vars.sumBorrowPlusEffects);
                if (mErr != MathError.NO_ERROR) {
                    return (Error.MATH_ERROR, 0, 0);
                }
            }
        }

        /// @dev BAI Integration^
        (mErr, vars.sumBorrowPlusEffects) = addUInt(vars.sumBorrowPlusEffects, mintedBAIs[account]);
        if (mErr != MathError.NO_ERROR) {
            return (Error.MATH_ERROR, 0, 0);
        }
        /// @dev BAI Integration$

        // These are safe, as the underflow condition is checked first
        if (vars.sumCollateral > vars.sumBorrowPlusEffects) {
            return (Error.NO_ERROR, vars.sumCollateral - vars.sumBorrowPlusEffects, 0);
        } else {
            return (Error.NO_ERROR, 0, vars.sumBorrowPlusEffects - vars.sumCollateral);
        }
    }

    /**
     * @notice Calculate number of tokens of collateral asset to seize given an underlying amount
     * @dev Used in liquidation (called in brToken.liquidateBorrowFresh)
     * @param brTokenBorrowed The address of the borrowed brToken
     * @param brTokenCollateral The address of the collateral brToken
     * @param actualRepayAmount The amount of brTokenBorrowed underlying to convert into brTokenCollateral tokens
     * @return (errorCode, number of brTokenCollateral tokens to be seized in a liquidation)
     */
    function liquidateCalculateSeizeTokens(address brTokenBorrowed, address brTokenCollateral, uint actualRepayAmount) external view returns (uint, uint) {
        /* Read oracle prices for borrowed and collateral markets */
        uint priceBorrowedMantissa = oracle.getUnderlyingPrice(BRToken(brTokenBorrowed));
        uint priceCollateralMantissa = oracle.getUnderlyingPrice(BRToken(brTokenCollateral));
        if (priceBorrowedMantissa == 0 || priceCollateralMantissa == 0) {
            return (uint(Error.PRICE_ERROR), 0);
        }

        /*
         * Get the exchange rate and calculate the number of collateral tokens to seize:
         *  seizeAmount = actualRepayAmount * liquidationIncentive * priceBorrowed / priceCollateral
         *  seizeTokens = seizeAmount / exchangeRate
         *   = actualRepayAmount * (liquidationIncentive * priceBorrowed) / (priceCollateral * exchangeRate)
         */
        uint exchangeRateMantissa = BRToken(brTokenCollateral).exchangeRateStored(); // Note: reverts on error
        uint seizeTokens;
        Exp memory numerator;
        Exp memory denominator;
        Exp memory ratio;
        MathError mathErr;

        (mathErr, numerator) = mulExp(liquidationIncentiveMantissa, priceBorrowedMantissa);
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        (mathErr, denominator) = mulExp(priceCollateralMantissa, exchangeRateMantissa);
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        (mathErr, ratio) = divExp(numerator, denominator);
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        (mathErr, seizeTokens) = mulScalarTruncate(ratio, actualRepayAmount);
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        return (uint(Error.NO_ERROR), seizeTokens);
    }

    /*** Admin Functions ***/

    /**
      * @notice Sets a new price oracle for the comptroller
      * @dev Admin function to set a new price oracle
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setPriceOracle(PriceOracle newOracle) public returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PRICE_ORACLE_OWNER_CHECK);
        }

        // Track the old oracle for the comptroller
        PriceOracle oldOracle = oracle;

        // Set comptroller's oracle to newOracle
        oracle = newOracle;

        // Emit NewPriceOracle(oldOracle, newOracle)
        emit NewPriceOracle(oldOracle, newOracle);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the closeFactor used when liquidating borrows
      * @dev Admin function to set closeFactor
      * @param newCloseFactorMantissa New close factor, scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setCloseFactor(uint newCloseFactorMantissa) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_CLOSE_FACTOR_OWNER_CHECK);
        }

        Exp memory newCloseFactorExp = Exp({mantissa: newCloseFactorMantissa});
        Exp memory lowLimit = Exp({mantissa: closeFactorMinMantissa});
        if (lessThanOrEqualExp(newCloseFactorExp, lowLimit)) {
            return fail(Error.INVALID_CLOSE_FACTOR, FailureInfo.SET_CLOSE_FACTOR_VALIDATION);
        }

        Exp memory highLimit = Exp({mantissa: closeFactorMaxMantissa});
        if (lessThanExp(highLimit, newCloseFactorExp)) {
            return fail(Error.INVALID_CLOSE_FACTOR, FailureInfo.SET_CLOSE_FACTOR_VALIDATION);
        }

        uint oldCloseFactorMantissa = closeFactorMantissa;
        closeFactorMantissa = newCloseFactorMantissa;
        emit NewCloseFactor(oldCloseFactorMantissa, newCloseFactorMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the collateralFactor for a market
      * @dev Admin function to set per-market collateralFactor
      * @param brToken The market to set the factor on
      * @param newCollateralFactorMantissa The new collateral factor, scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setCollateralFactor(BRToken brToken, uint newCollateralFactorMantissa) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_COLLATERAL_FACTOR_OWNER_CHECK);
        }

        // Verify market is listed
        Market storage market = markets[address(brToken)];
        if (!market.isListed) {
            return fail(Error.MARKET_NOT_LISTED, FailureInfo.SET_COLLATERAL_FACTOR_NO_EXISTS);
        }

        Exp memory newCollateralFactorExp = Exp({mantissa: newCollateralFactorMantissa});

        // Check collateral factor <= 0.9
        Exp memory highLimit = Exp({mantissa: collateralFactorMaxMantissa});
        if (lessThanExp(highLimit, newCollateralFactorExp)) {
            return fail(Error.INVALID_COLLATERAL_FACTOR, FailureInfo.SET_COLLATERAL_FACTOR_VALIDATION);
        }

        // If collateral factor != 0, fail if price == 0
        if (newCollateralFactorMantissa != 0 && oracle.getUnderlyingPrice(brToken) == 0) {
            return fail(Error.PRICE_ERROR, FailureInfo.SET_COLLATERAL_FACTOR_WITHOUT_PRICE);
        }

        // Set market's collateral factor to new collateral factor, remember old value
        uint oldCollateralFactorMantissa = market.collateralFactorMantissa;
        market.collateralFactorMantissa = newCollateralFactorMantissa;

        // Emit event with asset, old collateral factor, and new collateral factor
        emit NewCollateralFactor(brToken, oldCollateralFactorMantissa, newCollateralFactorMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets maxAssets which controls how many markets can be entered
      * @dev Admin function to set maxAssets
      * @param newMaxAssets New max assets
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setMaxAssets(uint newMaxAssets) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_MAX_ASSETS_OWNER_CHECK);
        }

        uint oldMaxAssets = maxAssets;
        maxAssets = newMaxAssets;
        emit NewMaxAssets(oldMaxAssets, newMaxAssets);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets liquidationIncentive
      * @dev Admin function to set liquidationIncentive
      * @param newLiquidationIncentiveMantissa New liquidationIncentive scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setLiquidationIncentive(uint newLiquidationIncentiveMantissa) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_LIQUIDATION_INCENTIVE_OWNER_CHECK);
        }

        // Check de-scaled min <= newLiquidationIncentive <= max
        Exp memory newLiquidationIncentive = Exp({mantissa: newLiquidationIncentiveMantissa});
        Exp memory minLiquidationIncentive = Exp({mantissa: liquidationIncentiveMinMantissa});
        if (lessThanExp(newLiquidationIncentive, minLiquidationIncentive)) {
            return fail(Error.INVALID_LIQUIDATION_INCENTIVE, FailureInfo.SET_LIQUIDATION_INCENTIVE_VALIDATION);
        }

        Exp memory maxLiquidationIncentive = Exp({mantissa: liquidationIncentiveMaxMantissa});
        if (lessThanExp(maxLiquidationIncentive, newLiquidationIncentive)) {
            return fail(Error.INVALID_LIQUIDATION_INCENTIVE, FailureInfo.SET_LIQUIDATION_INCENTIVE_VALIDATION);
        }

        // Save current value for use in log
        uint oldLiquidationIncentiveMantissa = liquidationIncentiveMantissa;

        // Set liquidation incentive to new incentive
        liquidationIncentiveMantissa = newLiquidationIncentiveMantissa;

        // Emit event with old incentive, new incentive
        emit NewLiquidationIncentive(oldLiquidationIncentiveMantissa, newLiquidationIncentiveMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Add the market to the markets mapping and set it as listed
      * @dev Admin function to set isListed and add support for the market
      * @param brToken The address of the market (token) to list
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _supportMarket(BRToken brToken) external returns (uint) {
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SUPPORT_MARKET_OWNER_CHECK);
        }

        if (markets[address(brToken)].isListed) {
            return fail(Error.MARKET_ALREADY_LISTED, FailureInfo.SUPPORT_MARKET_EXISTS);
        }

        brToken.isBRToken(); // Sanity check to make sure its really a BRToken

        markets[address(brToken)] = Market({isListed: true, isBrainiac: false, collateralFactorMantissa: 0});

        _addMarketInternal(brToken);

        emit MarketListed(brToken);

        return uint(Error.NO_ERROR);
    }

    function _addMarketInternal(BRToken brToken) internal {
        for (uint i = 0; i < allMarkets.length; i ++) {
            require(allMarkets[i] != brToken, "market already added");
        }
        allMarkets.push(brToken);
    }

    /**
     * @notice Admin function to change the Pause Guardian
     * @param newPauseGuardian The address of the new Pause Guardian
     * @return uint 0=success, otherwise a failure. (See enum Error for details)
     */
    function _setPauseGuardian(address newPauseGuardian) public returns (uint) {
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PAUSE_GUARDIAN_OWNER_CHECK);
        }

        // Save current value for inclusion in log
        address oldPauseGuardian = pauseGuardian;

        // Store pauseGuardian with value newPauseGuardian
        pauseGuardian = newPauseGuardian;

        // Emit NewPauseGuardian(OldPauseGuardian, NewPauseGuardian)
        emit NewPauseGuardian(oldPauseGuardian, newPauseGuardian);

        return uint(Error.NO_ERROR);
    }

    function _setMintPaused(BRToken brToken, bool state) public onlyListedMarket(brToken) validPauseState(state) returns (bool) {
        mintGuardianPaused[address(brToken)] = state;
        emit ActionPaused(brToken, "Mint", state);
        return state;
    }

    function _setBorrowPaused(BRToken brToken, bool state) public onlyListedMarket(brToken) validPauseState(state) returns (bool) {
        borrowGuardianPaused[address(brToken)] = state;
        emit ActionPaused(brToken, "Borrow", state);
        return state;
    }

    function _setTransferPaused(bool state) public validPauseState(state) returns (bool) {
        transferGuardianPaused = state;
        emit ActionPaused("Transfer", state);
        return state;
    }

    function _setSeizePaused(bool state) public validPauseState(state) returns (bool) {
        seizeGuardianPaused = state;
        emit ActionPaused("Seize", state);
        return state;
    }

    function _setMintBAIPaused(bool state) public validPauseState(state) returns (bool) {
        mintBAIGuardianPaused = state;
        emit ActionPaused("MintBAI", state);
        return state;
    }

    function _setRepayBAIPaused(bool state) public validPauseState(state) returns (bool) {
        repayBAIGuardianPaused = state;
        emit ActionPaused("RepayBAI", state);
        return state;
    }
    /**
     * @notice Set whole protocol pause/unpause state
     */
    function _setProtocolPaused(bool state) public onlyAdmin returns(bool) {
        protocolPaused = state;
        emit ActionProtocolPaused(state);
        return state;
    }

    /**
      * @notice Sets a new BAI controller
      * @dev Admin function to set a new BAI controller
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setBAIController(BAIControllerInterface baiController_) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_BAICONTROLLER_OWNER_CHECK);
        }

        BAIControllerInterface oldRate = baiController;
        baiController = baiController_;
        emit NewBAIController(oldRate, baiController_);
    }

    function _setBAIMintRate(uint newBAIMintRate) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_BAI_MINT_RATE_CHECK);
        }

        uint oldBAIMintRate = baiMintRate;
        baiMintRate = newBAIMintRate;
        emit NewBAIMintRate(oldBAIMintRate, newBAIMintRate);

        return uint(Error.NO_ERROR);
    }

    function _become(Unitroller unitroller) public {
        require(msg.sender == unitroller.admin(), "only unitroller admin can");
        require(unitroller._acceptImplementation() == 0, "not authorized");
    }

    /*** Brainiac Distribution ***/

    /**
     * @notice Recalculate and update Brainiac speeds for all Brainiac markets
     */
    function refreshBrainiacSpeeds() public {
        require(msg.sender == tx.origin, "only externally owned accounts can");
        refreshBrainiacSpeedsInternal();
    }

    function refreshBrainiacSpeedsInternal() internal {
        uint i;
        BRToken brToken;

        for (i = 0; i < allMarkets.length; i++) {
            brToken = allMarkets[i];
            Exp memory borrowIndex = Exp({mantissa: brToken.borrowIndex()});
            updateBrainiacSupplyIndex(address(brToken));
            updateBrainiacBorrowIndex(address(brToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets.length);
        for (i = 0; i < allMarkets.length; i++) {
            brToken = allMarkets[i];
            if (markets[address(brToken)].isBrainiac) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(brToken)});
                Exp memory utility = mul_(assetPrice, brToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (i = 0; i < allMarkets.length; i++) {
            brToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(brainiacRate, div_(utilities[i], totalUtility)) : 0;
            brainiacSpeeds[address(brToken)] = newSpeed;
            emit BrainiacSpeedUpdated(brToken, newSpeed);
        }
    }

    /**
     * @notice Accrue BRN to the market by updating the supply index
     * @param brToken The market whose supply index to update
     */
    function updateBrainiacSupplyIndex(address brToken) internal {
        BrainiacMarketState storage supplyState = brainiacSupplyState[brToken];
        uint supplySpeed = brainiacSpeeds[brToken];
        uint blockNumber = getBlockNumber();
        uint deltaBlocks = sub_(blockNumber, uint(supplyState.block));
        if (deltaBlocks > 0 && supplySpeed > 0) {
            uint supplyTokens = BRToken(brToken).totalSupply();
            uint brainiacAccrued = mul_(deltaBlocks, supplySpeed);
            Double memory ratio = supplyTokens > 0 ? fraction(brainiacAccrued, supplyTokens) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: supplyState.index}), ratio);
            brainiacSupplyState[brToken] = BrainiacMarketState({
                index: safe224(index.mantissa, "new index overflows"),
                block: safe32(blockNumber, "block number overflows")
            });
        } else if (deltaBlocks > 0) {
            supplyState.block = safe32(blockNumber, "block number overflows");
        }
    }

    /**
     * @notice Accrue BRN to the market by updating the borrow index
     * @param brToken The market whose borrow index to update
     */
    function updateBrainiacBorrowIndex(address brToken, Exp memory marketBorrowIndex) internal {
        BrainiacMarketState storage borrowState = brainiacBorrowState[brToken];
        uint borrowSpeed = brainiacSpeeds[brToken];
        uint blockNumber = getBlockNumber();
        uint deltaBlocks = sub_(blockNumber, uint(borrowState.block));
        if (deltaBlocks > 0 && borrowSpeed > 0) {
            uint borrowAmount = div_(BRToken(brToken).totalBorrows(), marketBorrowIndex);
            uint brainiacAccrued = mul_(deltaBlocks, borrowSpeed);
            Double memory ratio = borrowAmount > 0 ? fraction(brainiacAccrued, borrowAmount) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: borrowState.index}), ratio);
            brainiacBorrowState[brToken] = BrainiacMarketState({
                index: safe224(index.mantissa, "new index overflows"),
                block: safe32(blockNumber, "block number overflows")
            });
        } else if (deltaBlocks > 0) {
            borrowState.block = safe32(blockNumber, "block number overflows");
        }
    }

    /**
     * @notice Accrue BRN to by updating the BAI minter index
     */
    function updateBrainiacBAIMintIndex() internal {
        if (address(baiController) != address(0)) {
            baiController.updateBrainiacBAIMintIndex();
        }
    }

    /**
     * @notice Calculate BRN accrued by a supplier and possibly transfer it to them
     * @param brToken The market in which the supplier is interacting
     * @param supplier The address of the supplier to distribute BRN to
     */
    function distributeSupplierBrainiac(address brToken, address supplier, bool distributeAll) internal {
        BrainiacMarketState storage supplyState = brainiacSupplyState[brToken];
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({mantissa: brainiacSupplierIndex[brToken][supplier]});
        brainiacSupplierIndex[brToken][supplier] = supplyIndex.mantissa;

        if (supplierIndex.mantissa == 0 && supplyIndex.mantissa > 0) {
            supplierIndex.mantissa = brainiacInitialIndex;
        }

        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        uint supplierTokens = BRToken(brToken).balanceOf(supplier);
        uint supplierDelta = mul_(supplierTokens, deltaIndex);
        uint supplierAccrued = add_(brainiacAccrued[supplier], supplierDelta);
        brainiacAccrued[supplier] = transferBRN(supplier, supplierAccrued, distributeAll ? 0 : brainiacClaimThreshold);
        emit DistributedSupplierBrainiac(BRToken(brToken), supplier, supplierDelta, supplyIndex.mantissa);
    }

    /**
     * @notice Calculate BRN accrued by a borrower and possibly transfer it to them
     * @dev Borrowers will not begin to accrue until after the first interaction with the protocol.
     * @param brToken The market in which the borrower is interacting
     * @param borrower The address of the borrower to distribute BRN to
     */
    function distributeBorrowerBrainiac(address brToken, address borrower, Exp memory marketBorrowIndex, bool distributeAll) internal {
        BrainiacMarketState storage borrowState = brainiacBorrowState[brToken];
        Double memory borrowIndex = Double({mantissa: borrowState.index});
        Double memory borrowerIndex = Double({mantissa: brainiacBorrowerIndex[brToken][borrower]});
        brainiacBorrowerIndex[brToken][borrower] = borrowIndex.mantissa;

        if (borrowerIndex.mantissa > 0) {
            Double memory deltaIndex = sub_(borrowIndex, borrowerIndex);
            uint borrowerAmount = div_(BRToken(brToken).borrowBalanceStored(borrower), marketBorrowIndex);
            uint borrowerDelta = mul_(borrowerAmount, deltaIndex);
            uint borrowerAccrued = add_(brainiacAccrued[borrower], borrowerDelta);
            brainiacAccrued[borrower] = transferBRN(borrower, borrowerAccrued, distributeAll ? 0 : brainiacClaimThreshold);
            emit DistributedBorrowerBrainiac(BRToken(brToken), borrower, borrowerDelta, borrowIndex.mantissa);
        }
    }

    /**
     * @notice Calculate BRN accrued by a BAI minter and possibly transfer it to them
     * @dev BAI minters will not begin to accrue until after the first interaction with the protocol.
     * @param baiMinter The address of the BAI minter to distribute BRN to
     */
    function distributeBAIMinterBrainiac(address baiMinter, bool distributeAll) internal {
        if (address(baiController) != address(0)) {
            uint baiMinterAccrued;
            uint baiMinterDelta;
            uint baiMintIndexMantissa;
            uint err;
            (err, baiMinterAccrued, baiMinterDelta, baiMintIndexMantissa) = baiController.calcDistributeBAIMinterBrainiac(baiMinter);
            if (err == uint(Error.NO_ERROR)) {
                brainiacAccrued[baiMinter] = transferBRN(baiMinter, baiMinterAccrued, distributeAll ? 0 : brainiacClaimThreshold);
                emit DistributedBAIMinterBrainiac(baiMinter, baiMinterDelta, baiMintIndexMantissa);
            }
        }
    }

    /**
     * @notice Transfer BRN to the user, if they are above the threshold
     * @dev Note: If there is not enough BRN, we do not perform the transfer all.
     * @param user The address of the user to transfer BRN to
     * @param userAccrued The amount of BRN to (possibly) transfer
     * @return The amount of BRN which was NOT transferred to the user
     */
    function transferBRN(address user, uint userAccrued, uint threshold) internal returns (uint) {
        if (userAccrued >= threshold && userAccrued > 0) {
            BRN brn = BRN(getBRNAddress());
            uint brnRemaining = brn.balanceOf(address(this));
            if (userAccrued <= brnRemaining) {
                brn.transfer(user, userAccrued);
                return 0;
            }
        }
        return userAccrued;
    }

    /**
     * @notice Claim all the brn accrued by holder in all markets and BAI
     * @param holder The address to claim BRN for
     */
    function claimBrainiac(address holder) public {
        return claimBrainiac(holder, allMarkets);
    }

    /**
     * @notice Claim all the brn accrued by holder in the specified markets
     * @param holder The address to claim BRN for
     * @param brTokens The list of markets to claim BRN in
     */
    function claimBrainiac(address holder, BRToken[] memory brTokens) public {
        address[] memory holders = new address[](1);
        holders[0] = holder;
        claimBrainiac(holders, brTokens, true, true);
    }

    /**
     * @notice Claim all brn accrued by the holders
     * @param holders The addresses to claim BRN for
     * @param brTokens The list of markets to claim BRN in
     * @param borrowers Whether or not to claim BRN earned by borrowing
     * @param suppliers Whether or not to claim BRN earned by supplying
     */
    function claimBrainiac(address[] memory holders, BRToken[] memory brTokens, bool borrowers, bool suppliers) public {
        uint j;
        updateBrainiacBAIMintIndex();
        for (j = 0; j < holders.length; j++) {
            distributeBAIMinterBrainiac(holders[j], true);
        }
        for (uint i = 0; i < brTokens.length; i++) {
            BRToken brToken = brTokens[i];
            require(markets[address(brToken)].isListed, "not listed market");
            if (borrowers) {
                Exp memory borrowIndex = Exp({mantissa: brToken.borrowIndex()});
                updateBrainiacBorrowIndex(address(brToken), borrowIndex);
                for (j = 0; j < holders.length; j++) {
                    distributeBorrowerBrainiac(address(brToken), holders[j], borrowIndex, true);
                }
            }
            if (suppliers) {
                updateBrainiacSupplyIndex(address(brToken));
                for (j = 0; j < holders.length; j++) {
                    distributeSupplierBrainiac(address(brToken), holders[j], true);
                }
            }
        }
    }

    /*** Brainiac Distribution Admin ***/

    /**
     * @notice Set the amount of BRN distributed per block
     * @param brainiacRate_ The amount of BRN wei per block to distribute
     */
    function _setBrainiacRate(uint brainiacRate_) public onlyAdmin {
        uint oldRate = brainiacRate;
        brainiacRate = brainiacRate_;
        emit NewBrainiacRate(oldRate, brainiacRate_);

        refreshBrainiacSpeedsInternal();
    }

    /**
     * @notice Set the amount of BRN distributed per block to BAI Mint
     * @param brainiacBAIRate_ The amount of BRN wei per block to distribute to BAI Mint
     */
    function _setBrainiacBAIRate(uint brainiacBAIRate_) public {
        require(msg.sender == admin, "only admin can");

        uint oldBAIRate = brainiacBAIRate;
        brainiacBAIRate = brainiacBAIRate_;
        emit NewBrainiacBAIRate(oldBAIRate, brainiacBAIRate_);
    }

    /**
     * @notice Add markets to brainiacMarkets, allowing them to earn BRN in the flywheel
     * @param brTokens The addresses of the markets to add
     */
    function _addBrainiacMarkets(address[] calldata brTokens) external onlyAdmin {
        for (uint i = 0; i < brTokens.length; i++) {
            _addBrainiacMarketInternal(brTokens[i]);
        }

        refreshBrainiacSpeedsInternal();
    }

    function _addBrainiacMarketInternal(address brToken) internal {
        Market storage market = markets[brToken];
        require(market.isListed, "brainiac market is not listed");
        require(!market.isBrainiac, "brainiac market already added");

        market.isBrainiac = true;
        emit MarketBrainiac(BRToken(brToken), true);

        if (brainiacSupplyState[brToken].index == 0 && brainiacSupplyState[brToken].block == 0) {
            brainiacSupplyState[brToken] = BrainiacMarketState({
                index: brainiacInitialIndex,
                block: safe32(getBlockNumber(), "block number overflows")
            });
        }

        if (brainiacBorrowState[brToken].index == 0 && brainiacBorrowState[brToken].block == 0) {
            brainiacBorrowState[brToken] = BrainiacMarketState({
                index: brainiacInitialIndex,
                block: safe32(getBlockNumber(), "block number overflows")
            });
        }
    }

    function _initializeBrainiacBAIState(uint blockNumber) public {
        require(msg.sender == admin, "only admin can");
        if (address(baiController) != address(0)) {
            baiController._initializeBrainiacBAIState(blockNumber);
        }
    }

    /**
     * @notice Remove a market from brainiacMarkets, preventing it from earning BRN in the flywheel
     * @param brToken The address of the market to drop
     */
    function _dropBrainiacMarket(address brToken) public onlyAdmin {
        Market storage market = markets[brToken];
        require(market.isBrainiac == true, "not brainiac market");

        market.isBrainiac = false;
        emit MarketBrainiac(BRToken(brToken), false);

        refreshBrainiacSpeedsInternal();
    }

    /**
     * @notice Return all of the markets
     * @dev The automatic getter may be used to access an individual market.
     * @return The list of market addresses
     */
    function getAllMarkets() public view returns (BRToken[] memory) {
        return allMarkets;
    }

    function getBlockNumber() public view returns (uint) {
        return block.number;
    }

    /**
     * @notice Return the address of the BRN token
     * @return The address of BRN
     */
    function getBRNAddress() public view returns (address) {
        return 0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63;
    }

    /*** BAI functions ***/

    /**
     * @notice Set the minted BAI amount of the `owner`
     * @param owner The address of the account to set
     * @param amount The amount of BAI to set to the account
     * @return The number of minted BAI by `owner`
     */
    function setMintedBAIOf(address owner, uint amount) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!mintBAIGuardianPaused && !repayBAIGuardianPaused, "BAI is paused");
        // Check caller is baiController
        if (msg.sender != address(baiController)) {
            return fail(Error.REJECTION, FailureInfo.SET_MINTED_BAI_REJECTION);
        }
        mintedBAIs[owner] = amount;

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Mint BAI
     */
    function mintBAI(uint mintBAIAmount) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!mintBAIGuardianPaused, "mintBAI is paused");

        // Keep the flywheel moving
        updateBrainiacBAIMintIndex();
        distributeBAIMinterBrainiac(msg.sender, false);
        return baiController.mintBAI(msg.sender, mintBAIAmount);
    }

    /**
     * @notice Repay BAI
     */
    function repayBAI(uint repayBAIAmount) external onlyProtocolAllowed returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!repayBAIGuardianPaused, "repayBAI is paused");

        // Keep the flywheel moving
        updateBrainiacBAIMintIndex();
        distributeBAIMinterBrainiac(msg.sender, false);
        return baiController.repayBAI(msg.sender, repayBAIAmount);
    }

    /**
     * @notice Get the minted BAI amount of the `owner`
     * @param owner The address of the account to query
     * @return The number of minted BAI by `owner`
     */
    function mintedBAIOf(address owner) external view returns (uint) {
        return mintedBAIs[owner];
    }

    /**
     * @notice Get Mintable BAI amount
     */
    function getMintableBAI(address minter) external view returns (uint, uint) {
        return baiController.getMintableBAI(minter);
    }
}
