pragma solidity ^0.5.16;

import "../Comptroller.sol";
import "../PriceOracle.sol";

contract ComptrollerKovan is Comptroller {
  function getBRNAddress() public view returns (address) {
    return 0x61460874a7196d6a22D1eE4922473664b3E95270;
  }
}

contract ComptrollerRopsten is Comptroller {
  function getBRNAddress() public view returns (address) {
    return 0x1Fe16De955718CFAb7A44605458AB023838C2793;
  }
}

contract ComptrollerHarness is Comptroller {
    address brnAddress;
    address brBRNAddress;
    uint public blockNumber;

    constructor() Comptroller() public {}

    function setBrainiacSupplyState(address brToken, uint224 index, uint32 blockNumber_) public {
        brainiacSupplyState[brToken].index = index;
        brainiacSupplyState[brToken].block = blockNumber_;
    }

    function setBrainiacBorrowState(address brToken, uint224 index, uint32 blockNumber_) public {
        brainiacBorrowState[brToken].index = index;
        brainiacBorrowState[brToken].block = blockNumber_;
    }

    function setBrainiacAccrued(address user, uint userAccrued) public {
        brainiacAccrued[user] = userAccrued;
    }

    function setBRNAddress(address brnAddress_) public {
        brnAddress = brnAddress_;
    }

    function getBRNAddress() public view returns (address) {
        return brnAddress;
    }

    function setBRNBRTokenAddress(address brBRNAddress_) public {
        brBRNAddress = brBRNAddress_;
    }

    function getBRNBRTokenAddress() public view returns (address) {
        return brBRNAddress;
    }

    /**
     * @notice Set the amount of BRN distributed per block
     * @param brainiacRate_ The amount of BRN wei per block to distribute
     */
    function harnessSetBrainiacRate(uint brainiacRate_) public {
        brainiacRate = brainiacRate_;
    }

    /**
     * @notice Recalculate and update BRN speeds for all BRN markets
     */
    function harnessRefreshBrainiacSpeeds() public {
        BRToken[] memory allMarkets_ = allMarkets;

        for (uint i = 0; i < allMarkets_.length; i++) {
            BRToken brToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: brToken.borrowIndex()});
            updateBrainiacSupplyIndex(address(brToken));
            updateBrainiacBorrowIndex(address(brToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint i = 0; i < allMarkets_.length; i++) {
            BRToken brToken = allMarkets_[i];
            if (brainiacSpeeds[address(brToken)] > 0) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(brToken)});
                Exp memory utility = mul_(assetPrice, brToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint i = 0; i < allMarkets_.length; i++) {
            BRToken brToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(brainiacRate, div_(utilities[i], totalUtility)) : 0;
            setBrainiacSpeedInternal(brToken, newSpeed);
        }
    }

    function setBrainiacBorrowerIndex(address brToken, address borrower, uint index) public {
        brainiacBorrowerIndex[brToken][borrower] = index;
    }

    function setBrainiacSupplierIndex(address brToken, address supplier, uint index) public {
        brainiacSupplierIndex[brToken][supplier] = index;
    }

    function harnessDistributeAllBorrowerBrainiac(address brToken, address borrower, uint marketBorrowIndexMantissa) public {
        distributeBorrowerBrainiac(brToken, borrower, Exp({mantissa: marketBorrowIndexMantissa}));
        brainiacAccrued[borrower] = grantBRNInternal(borrower, brainiacAccrued[borrower], 0, false);
    }

    function harnessDistributeAllSupplierBrainiac(address brToken, address supplier) public {
        distributeSupplierBrainiac(brToken, supplier);
        brainiacAccrued[supplier] = grantBRNInternal(supplier, brainiacAccrued[supplier], 0, false);
    }

    function harnessUpdateBrainiacBorrowIndex(address brToken, uint marketBorrowIndexMantissa) public {
        updateBrainiacBorrowIndex(brToken, Exp({mantissa: marketBorrowIndexMantissa}));
    }

    function harnessUpdateBrainiacSupplyIndex(address brToken) public {
        updateBrainiacSupplyIndex(brToken);
    }

    function harnessDistributeBorrowerBrainiac(address brToken, address borrower, uint marketBorrowIndexMantissa) public {
        distributeBorrowerBrainiac(brToken, borrower, Exp({mantissa: marketBorrowIndexMantissa}));
    }

    function harnessDistributeSupplierBrainiac(address brToken, address supplier) public {
        distributeSupplierBrainiac(brToken, supplier);
    }

    function harnessTransferBrainiac(address user, uint userAccrued, uint threshold) public returns (uint) {
        if (userAccrued > 0 && userAccrued >= threshold) {
            return grantBRNInternal(user, userAccrued, 0, false);
        }
        return userAccrued;
    }

    function harnessAddBrainiacMarkets(address[] memory brTokens) public {
        for (uint i = 0; i < brTokens.length; i++) {
            // temporarily set brainiacSpeed to 1 (will be fixed by `harnessRefreshBrainiacSpeeds`)
            setBrainiacSpeedInternal(BRToken(brTokens[i]), 1);
        }
    }

    function harnessSetMintedBAIs(address user, uint amount) public {
        mintedBAIs[user] = amount;
    }

    function harnessFastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function getBrainiacMarkets() public view returns (address[] memory) {
        uint m = allMarkets.length;
        uint n = 0;
        for (uint i = 0; i < m; i++) {
            if (brainiacSpeeds[address(allMarkets[i])] > 0) {
                n++;
            }
        }

        address[] memory brainiacMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (brainiacSpeeds[address(allMarkets[i])] > 0) {
                brainiacMarkets[k++] = address(allMarkets[i]);
            }
        }
        return brainiacMarkets;
    }

    function harnessSetReleaseStartBlock(uint startBlock) external {
        releaseStartBlock = startBlock;
    }
}

contract ComptrollerBorked {
    function _become(Unitroller unitroller) public {
        require(msg.sender == unitroller.admin(), "only unitroller admin can change brains");
        unitroller._acceptImplementation();
    }
}

contract BoolComptroller is ComptrollerInterface {
    bool allowMint = true;
    bool allowRedeem = true;
    bool allowBorrow = true;
    bool allowRepayBorrow = true;
    bool allowLiquidateBorrow = true;
    bool allowSeize = true;
    bool allowTransfer = true;

    bool verifyMint = true;
    bool verifyRedeem = true;
    bool verifyBorrow = true;
    bool verifyRepayBorrow = true;
    bool verifyLiquidateBorrow = true;
    bool verifySeize = true;
    bool verifyTransfer = true;
    uint public liquidationIncentiveMantissa = 11e17;
    bool failCalculateSeizeTokens;
    uint calculatedSeizeTokens;

    bool public protocolPaused = false;

    mapping(address => uint) public mintedBAIs;
    bool baiFailCalculateSeizeTokens;
    uint baiCalculatedSeizeTokens;

    uint noError = 0;
    uint opaqueError = noError + 11; // an arbitrary, opaque error code

    address public treasuryGuardian;
    address public treasuryAddress;
    uint public treasuryPercent;
    address public liquidatorContract;

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata _brTokens) external returns (uint[] memory) {
        _brTokens;
        uint[] memory ret;
        return ret;
    }

    function exitMarket(address _brToken) external returns (uint) {
        _brToken;
        return noError;
    }

    /*** Policy Hooks ***/

    function mintAllowed(address _brToken, address _minter, uint _mintAmount) external returns (uint) {
        _brToken;
        _minter;
        _mintAmount;
        return allowMint ? noError : opaqueError;
    }

    function mintVerify(address _brToken, address _minter, uint _mintAmount, uint _mintTokens) external {
        _brToken;
        _minter;
        _mintAmount;
        _mintTokens;
        require(verifyMint, "mintVerify rejected mint");
    }

    function redeemAllowed(address _brToken, address _redeemer, uint _redeemTokens) external returns (uint) {
        _brToken;
        _redeemer;
        _redeemTokens;
        return allowRedeem ? noError : opaqueError;
    }

    function redeemVerify(address _brToken, address _redeemer, uint _redeemAmount, uint _redeemTokens) external {
        _brToken;
        _redeemer;
        _redeemAmount;
        _redeemTokens;
        require(verifyRedeem, "redeemVerify rejected redeem");
    }

    function borrowAllowed(address _brToken, address _borrower, uint _borrowAmount) external returns (uint) {
        _brToken;
        _borrower;
        _borrowAmount;
        return allowBorrow ? noError : opaqueError;
    }

    function borrowVerify(address _brToken, address _borrower, uint _borrowAmount) external {
        _brToken;
        _borrower;
        _borrowAmount;
        require(verifyBorrow, "borrowVerify rejected borrow");
    }

    function repayBorrowAllowed(
        address _brToken,
        address _payer,
        address _borrower,
        uint _repayAmount) external returns (uint) {
        _brToken;
        _payer;
        _borrower;
        _repayAmount;
        return allowRepayBorrow ? noError : opaqueError;
    }

    function repayBorrowVerify(
        address _brToken,
        address _payer,
        address _borrower,
        uint _repayAmount,
        uint _borrowerIndex) external {
        _brToken;
        _payer;
        _borrower;
        _repayAmount;
        _borrowerIndex;
        require(verifyRepayBorrow, "repayBorrowVerify rejected repayBorrow");
    }

    function _setLiquidatorContract(address liquidatorContract_) external {
        liquidatorContract = liquidatorContract_;
    }

    function liquidateBorrowAllowed(
        address _brTokenBorrowed,
        address _brTokenCollateral,
        address _liquidator,
        address _borrower,
        uint _repayAmount) external returns (uint) {
        _brTokenBorrowed;
        _brTokenCollateral;
        _borrower;
        _repayAmount;
        if (liquidatorContract != address(0) && liquidatorContract != _liquidator) {
            return opaqueError;
        }
        return allowLiquidateBorrow ? noError : opaqueError;
    }

    function liquidateBorrowVerify(
        address _brTokenBorrowed,
        address _brTokenCollateral,
        address _liquidator,
        address _borrower,
        uint _repayAmount,
        uint _seizeTokens) external {
        _brTokenBorrowed;
        _brTokenCollateral;
        _liquidator;
        _borrower;
        _repayAmount;
        _seizeTokens;
        require(verifyLiquidateBorrow, "liquidateBorrowVerify rejected liquidateBorrow");
    }

    function seizeAllowed(
        address _brTokenCollateral,
        address _brTokenBorrowed,
        address _borrower,
        address _liquidator,
        uint _seizeTokens) external returns (uint) {
        _brTokenCollateral;
        _brTokenBorrowed;
        _liquidator;
        _borrower;
        _seizeTokens;
        return allowSeize ? noError : opaqueError;
    }

    function seizeVerify(
        address _brTokenCollateral,
        address _brTokenBorrowed,
        address _liquidator,
        address _borrower,
        uint _seizeTokens) external {
        _brTokenCollateral;
        _brTokenBorrowed;
        _liquidator;
        _borrower;
        _seizeTokens;
        require(verifySeize, "seizeVerify rejected seize");
    }

    function transferAllowed(
        address _brToken,
        address _src,
        address _dst,
        uint _transferTokens) external returns (uint) {
        _brToken;
        _src;
        _dst;
        _transferTokens;
        return allowTransfer ? noError : opaqueError;
    }

    function transferVerify(
        address _brToken,
        address _src,
        address _dst,
        uint _transferTokens) external {
        _brToken;
        _src;
        _dst;
        _transferTokens;
        require(verifyTransfer, "transferVerify rejected transfer");
    }

    /*** Special Liquidation Calculation ***/

    function liquidateCalculateSeizeTokens(
        address _brTokenBorrowed,
        address _brTokenCollateral,
        uint _repayAmount) external view returns (uint, uint) {
        _brTokenBorrowed;
        _brTokenCollateral;
        _repayAmount;
        return failCalculateSeizeTokens ? (opaqueError, 0) : (noError, calculatedSeizeTokens);
    }

    /*** Special Liquidation Calculation ***/

    function liquidateBAICalculateSeizeTokens(
        address _brTokenCollateral,
        uint _repayAmount) external view returns (uint, uint) {
        _brTokenCollateral;
        _repayAmount;
        return baiFailCalculateSeizeTokens ? (opaqueError, 0) : (noError, baiCalculatedSeizeTokens);
    }

    /**** Mock Settors ****/

    /*** Policy Hooks ***/

    function setMintAllowed(bool allowMint_) public {
        allowMint = allowMint_;
    }

    function setMintVerify(bool verifyMint_) public {
        verifyMint = verifyMint_;
    }

    function setRedeemAllowed(bool allowRedeem_) public {
        allowRedeem = allowRedeem_;
    }

    function setRedeemVerify(bool verifyRedeem_) public {
        verifyRedeem = verifyRedeem_;
    }

    function setBorrowAllowed(bool allowBorrow_) public {
        allowBorrow = allowBorrow_;
    }

    function setBorrowVerify(bool verifyBorrow_) public {
        verifyBorrow = verifyBorrow_;
    }

    function setRepayBorrowAllowed(bool allowRepayBorrow_) public {
        allowRepayBorrow = allowRepayBorrow_;
    }

    function setRepayBorrowVerify(bool verifyRepayBorrow_) public {
        verifyRepayBorrow = verifyRepayBorrow_;
    }

    function setLiquidateBorrowAllowed(bool allowLiquidateBorrow_) public {
        allowLiquidateBorrow = allowLiquidateBorrow_;
    }

    function setLiquidateBorrowVerify(bool verifyLiquidateBorrow_) public {
        verifyLiquidateBorrow = verifyLiquidateBorrow_;
    }

    function setSeizeAllowed(bool allowSeize_) public {
        allowSeize = allowSeize_;
    }

    function setSeizeVerify(bool verifySeize_) public {
        verifySeize = verifySeize_;
    }

    function setTransferAllowed(bool allowTransfer_) public {
        allowTransfer = allowTransfer_;
    }

    function setTransferVerify(bool verifyTransfer_) public {
        verifyTransfer = verifyTransfer_;
    }

    /*** Liquidity/Liquidation Calculations ***/
    function setAnnouncedLiquidationIncentiveMantissa(uint mantissa_) external {
        liquidationIncentiveMantissa = mantissa_;
    }

    /*** Liquidity/Liquidation Calculations ***/

    function setCalculatedSeizeTokens(uint seizeTokens_) public {
        calculatedSeizeTokens = seizeTokens_;
    }

    function setFailCalculateSeizeTokens(bool shouldFail) public {
        failCalculateSeizeTokens = shouldFail;
    }

    function setBAICalculatedSeizeTokens(uint baiSeizeTokens_) public {
        baiCalculatedSeizeTokens = baiSeizeTokens_;
    }

    function setBAIFailCalculateSeizeTokens(bool baiShouldFail) public {
        baiFailCalculateSeizeTokens = baiShouldFail;
    }

    function harnessSetMintedBAIOf(address owner, uint amount) external returns (uint) {
        mintedBAIs[owner] = amount;
        return noError;
    }

    // function mintedBAIs(address owner) external pure returns (uint) {
    //     owner;
    //     return 1e18;
    // }

    function setMintedBAIOf(address owner, uint amount) external returns (uint) {
        owner;
        amount;
        return noError;
    }

    function baiMintRate() external pure returns (uint) {
        return 1e18;
    }

    function setTreasuryData(address treasuryGuardian_, address treasuryAddress_, uint treasuryPercent_) external {
        treasuryGuardian = treasuryGuardian_;
        treasuryAddress = treasuryAddress_;
        treasuryPercent = treasuryPercent_;
    }

    /*** Functions from ComptrollerInterface not implemented by BoolComptroller ***/

    function markets(address) external view returns (bool, uint) { revert(); }
    function oracle() external view returns (PriceOracle) { revert(); }
    function getAccountLiquidity(address) external view returns (uint, uint, uint) { revert(); }
    function getAssetsIn(address) external view returns (BRToken[] memory) { revert(); }
    function claimBrainiac(address) external { revert(); }
    function brainiacAccrued(address) external view returns (uint) { revert(); }
    function brainiacSpeeds(address) external view returns (uint) { revert(); }
    function getAllMarkets() external view returns (BRToken[] memory) { revert(); }
    function brainiacSupplierIndex(address, address) external view returns (uint) { revert(); }
    function brainiacInitialIndex() external view returns (uint224) { revert(); }
    function brainiacBorrowerIndex(address, address) external view returns (uint) { revert(); }
    function brainiacBorrowState(address) external view returns (uint224, uint32) { revert(); }
    function brainiacSupplyState(address) external view returns (uint224, uint32) { revert(); }
}

contract EchoTypesComptroller is UnitrollerAdminStorage {
    function stringy(string memory s) public pure returns(string memory) {
        return s;
    }

    function addresses(address a) public pure returns(address) {
        return a;
    }

    function booly(bool b) public pure returns(bool) {
        return b;
    }

    function listOInts(uint[] memory u) public pure returns(uint[] memory) {
        return u;
    }

    function reverty() public pure {
        require(false, "gotcha sucka");
    }

    function becomeBrains(address payable unitroller) public {
        Unitroller(unitroller)._acceptImplementation();
    }
}
