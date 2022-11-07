pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../BRErc20.sol";
import "../BRToken.sol";
import "../PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Governance/GovernorAlpha.sol";
import "../Governance/BRN.sol";
import "../ComptrollerInterface.sol";
import "../SafeMath.sol";

contract BrainiacLens is ExponentialNoError {

    using SafeMath for uint;

    /// @notice Blocks Per Day
    uint public constant BLOCKS_PER_DAY = 1440;

    struct BrainiacMarketState {
        uint224 index;
        uint32 block;
    }

    struct BRTokenMetadata {
        address brToken;
        uint exchangeRateCurrent;
        uint supplyRatePerBlock;
        uint borrowRatePerBlock;
        uint reserveFactorMantissa;
        uint totalBorrows;
        uint totalReserves;
        uint totalSupply;
        uint totalCash;
        bool isListed;
        uint collateralFactorMantissa;
        address underlyingAssetAddress;
        uint brTokenDecimals;
        uint underlyingDecimals;
        uint brainiacSupplySpeed;
        uint brainiacBorrowSpeed;
        uint dailySupplyBrn;
        uint dailyBorrowBrn;
    }

    function brTokenMetadata(BRToken brToken) public returns (BRTokenMetadata memory) {
        uint exchangeRateCurrent = brToken.exchangeRateCurrent();
        address comptrollerAddress = address(brToken.comptroller());
        ComptrollerInterface comptroller = ComptrollerInterface(comptrollerAddress);
        (bool isListed, uint collateralFactorMantissa) = comptroller.markets(address(brToken));
        address underlyingAssetAddress;
        uint underlyingDecimals;

        if (compareStrings(brToken.symbol(), "brCKB")) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            BRErc20 brErc20 = BRErc20(address(brToken));
            underlyingAssetAddress = brErc20.underlying();
            underlyingDecimals = EIP20Interface(brErc20.underlying()).decimals();
        }

        uint brainiacSpeedPerBlock = comptroller.brainiacSpeeds(address(brToken));

        return BRTokenMetadata({
            brToken: address(brToken),
            exchangeRateCurrent: exchangeRateCurrent,
            supplyRatePerBlock: brToken.supplyRatePerBlock(),
            borrowRatePerBlock: brToken.borrowRatePerBlock(),
            reserveFactorMantissa: brToken.reserveFactorMantissa(),
            totalBorrows: brToken.totalBorrows(),
            totalReserves: brToken.totalReserves(),
            totalSupply: brToken.totalSupply(),
            totalCash: brToken.getCash(),
            isListed: isListed,
            collateralFactorMantissa: collateralFactorMantissa,
            underlyingAssetAddress: underlyingAssetAddress,
            brTokenDecimals: brToken.decimals(),
            underlyingDecimals: underlyingDecimals,
            brainiacSupplySpeed: brainiacSpeedPerBlock,
            brainiacBorrowSpeed: brainiacSpeedPerBlock,
            dailySupplyBrn: brainiacSpeedPerBlock.mul(BLOCKS_PER_DAY),
            dailyBorrowBrn: brainiacSpeedPerBlock.mul(BLOCKS_PER_DAY)
        });
    }

    function brTokenMetadataAll(BRToken[] calldata brTokens) external returns (BRTokenMetadata[] memory) {
        uint brTokenCount = brTokens.length;
        BRTokenMetadata[] memory res = new BRTokenMetadata[](brTokenCount);
        for (uint i = 0; i < brTokenCount; i++) {
            res[i] = brTokenMetadata(brTokens[i]);
        }
        return res;
    }

    function getDailyBRN(address payable account, address comptrollerAddress, BRToken[] calldata _brTokens) external returns (uint) {
        ComptrollerInterface comptrollerInstance = ComptrollerInterface(comptrollerAddress);

          BRToken[] memory brTokens = _brTokens;
        uint dailyBrnPerAccount = 0;

        for (uint i = 0; i < brTokens.length; i++) {
            BRToken brToken = brTokens[i];
            BRTokenMetadata memory metaDataItem = brTokenMetadata(brToken);

            //get balanceOfUnderlying and borrowBalanceCurrent from brTokenBalance
            BRTokenBalances memory brTokenBalanceInfo = brTokenBalances(brToken, account);

            BRTokenUnderlyingPrice memory underlyingPriceResponse = brTokenUnderlyingPrice(brToken);
            uint underlyingPrice = underlyingPriceResponse.underlyingPrice;
            Exp memory underlyingPriceMantissa = Exp({mantissa: underlyingPrice});

            //get dailyBrnSupplyMarket
            uint dailyBrnSupplyMarket = 0;
            uint supplyInUsd = mul_ScalarTruncate(underlyingPriceMantissa, brTokenBalanceInfo.balanceOfUnderlying);
            uint marketTotalSupply = (metaDataItem.totalSupply.mul(metaDataItem.exchangeRateCurrent)).div(1e18);
            uint marketTotalSupplyInUsd = mul_ScalarTruncate(underlyingPriceMantissa, marketTotalSupply);

            if(marketTotalSupplyInUsd > 0) {
                dailyBrnSupplyMarket = (metaDataItem.dailySupplyBrn.mul(supplyInUsd)).div(marketTotalSupplyInUsd);
            }

            //get dailyBrnBorrowMarket
            uint dailyBrnBorrowMarket = 0;
            uint borrowsInUsd = mul_ScalarTruncate(underlyingPriceMantissa, brTokenBalanceInfo.borrowBalanceCurrent);
            uint marketTotalBorrowsInUsd = mul_ScalarTruncate(underlyingPriceMantissa, metaDataItem.totalBorrows);

            if(marketTotalBorrowsInUsd > 0){
                dailyBrnBorrowMarket = (metaDataItem.dailyBorrowBrn.mul(borrowsInUsd)).div(marketTotalBorrowsInUsd);
            }

            dailyBrnPerAccount += dailyBrnSupplyMarket + dailyBrnBorrowMarket;
        }

        return dailyBrnPerAccount;
    }

    struct BRTokenBalances {
        address brToken;
        uint balanceOf;
        uint borrowBalanceCurrent;
        uint balanceOfUnderlying;
        uint tokenBalance;
        uint tokenAllowance;
    }

    function brTokenBalances(BRToken brToken, address payable account) public returns (BRTokenBalances memory) {
        uint balanceOf = brToken.balanceOf(account);
        uint borrowBalanceCurrent = brToken.borrowBalanceCurrent(account);
        uint balanceOfUnderlying = brToken.balanceOfUnderlying(account);
        uint tokenBalance;
        uint tokenAllowance;

        if (compareStrings(brToken.symbol(), "brCKB")) {
            tokenBalance = account.balance;
            tokenAllowance = account.balance;
        } else {
            BRErc20 brErc20 = BRErc20(address(brToken));
            EIP20Interface underlying = EIP20Interface(brErc20.underlying());
            tokenBalance = underlying.balanceOf(account);
            tokenAllowance = underlying.allowance(account, address(brToken));
        }

        return BRTokenBalances({
            brToken: address(brToken),
            balanceOf: balanceOf,
            borrowBalanceCurrent: borrowBalanceCurrent,
            balanceOfUnderlying: balanceOfUnderlying,
            tokenBalance: tokenBalance,
            tokenAllowance: tokenAllowance
        });
    }

    function brTokenBalancesAll(BRToken[] calldata brTokens, address payable account) external returns (BRTokenBalances[] memory) {
        uint brTokenCount = brTokens.length;
        BRTokenBalances[] memory res = new BRTokenBalances[](brTokenCount);
        for (uint i = 0; i < brTokenCount; i++) {
            res[i] = brTokenBalances(brTokens[i], account);
        }
        return res;
    }

    struct BRTokenUnderlyingPrice {
        address brToken;
        uint underlyingPrice;
    }

    function brTokenUnderlyingPrice(BRToken brToken) public view returns (BRTokenUnderlyingPrice memory) {
        ComptrollerInterface comptroller = ComptrollerInterface(address(brToken.comptroller()));
        PriceOracle priceOracle = comptroller.oracle();

        return BRTokenUnderlyingPrice({
            brToken: address(brToken),
            underlyingPrice: priceOracle.getUnderlyingPrice(brToken)
        });
    }

    function brTokenUnderlyingPriceAll(BRToken[] calldata brTokens) external view returns (BRTokenUnderlyingPrice[] memory) {
        uint brTokenCount = brTokens.length;
        BRTokenUnderlyingPrice[] memory res = new BRTokenUnderlyingPrice[](brTokenCount);
        for (uint i = 0; i < brTokenCount; i++) {
            res[i] = brTokenUnderlyingPrice(brTokens[i]);
        }
        return res;
    }

    struct AccountLimits {
        BRToken[] markets;
        uint liquidity;
        uint shortfall;
    }

    function getAccountLimits(ComptrollerInterface comptroller, address account) public view returns (AccountLimits memory) {
        (uint errorCode, uint liquidity, uint shortfall) = comptroller.getAccountLiquidity(account);
        require(errorCode == 0, "account liquidity error");

        return AccountLimits({
            markets: comptroller.getAssetsIn(account),
            liquidity: liquidity,
            shortfall: shortfall
        });
    }

    struct GovReceipt {
        uint proposalId;
        bool hasVoted;
        bool support;
        uint96 votes;
    }

    function getGovReceipts(GovernorAlpha governor, address voter, uint[] memory proposalIds) public view returns (GovReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovReceipt[] memory res = new GovReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorAlpha.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        bool canceled;
        bool executed;
    }

    function setProposal(GovProposal memory res, GovernorAlpha governor, uint proposalId) internal view {
        (
            ,
            address proposer,
            uint eta,
            uint startBlock,
            uint endBlock,
            uint forVotes,
            uint againstVotes,
            bool canceled,
            bool executed
        ) = governor.proposals(proposalId);
        res.proposalId = proposalId;
        res.proposer = proposer;
        res.eta = eta;
        res.startBlock = startBlock;
        res.endBlock = endBlock;
        res.forVotes = forVotes;
        res.againstVotes = againstVotes;
        res.canceled = canceled;
        res.executed = executed;
    }

    function getGovProposals(GovernorAlpha governor, uint[] calldata proposalIds) external view returns (GovProposal[] memory) {
        GovProposal[] memory res = new GovProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                canceled: false,
                executed: false
            });
            setProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct BRNBalanceMetadata {
        uint balance;
        uint votes;
        address delegate;
    }

    function getBRNBalanceMetadata(BRN brn, address account) external view returns (BRNBalanceMetadata memory) {
        return BRNBalanceMetadata({
            balance: brn.balanceOf(account),
            votes: uint256(brn.getCurrentVotes(account)),
            delegate: brn.delegates(account)
        });
    }

    struct BRNBalanceMetadataExt {
        uint balance;
        uint votes;
        address delegate;
        uint allocated;
    }

    function getBRNBalanceMetadataExt(BRN brn, ComptrollerInterface comptroller, address account) external returns (BRNBalanceMetadataExt memory) {
        uint balance = brn.balanceOf(account);
        comptroller.claimBrainiac(account);
        uint newBalance = brn.balanceOf(account);
        uint accrued = comptroller.brainiacAccrued(account);
        uint total = add_(accrued, newBalance, "sum brn total");
        uint allocated = sub_(total, balance, "sub allocated");

        return BRNBalanceMetadataExt({
            balance: balance,
            votes: uint256(brn.getCurrentVotes(account)),
            delegate: brn.delegates(account),
            allocated: allocated
        });
    }

    struct BrainiacVotes {
        uint blockNumber;
        uint votes;
    }

    function getBrainiacVotes(BRN brn, address account, uint32[] calldata blockNumbers) external view returns (BrainiacVotes[] memory) {
        BrainiacVotes[] memory res = new BrainiacVotes[](blockNumbers.length);
        for (uint i = 0; i < blockNumbers.length; i++) {
            res[i] = BrainiacVotes({
                blockNumber: uint256(blockNumbers[i]),
                votes: uint256(brn.getPriorVotes(account, blockNumbers[i]))
            });
        }
        return res;
    }

    // calculate the accurate pending Brainiac rewards without touching any storage
    function updateBrainiacSupplyIndex(BrainiacMarketState memory supplyState, address brToken, ComptrollerInterface comptroller) internal view {
        uint supplySpeed = comptroller.brainiacSpeeds(brToken);
        uint blockNumber = block.number;
        uint deltaBlocks = sub_(blockNumber, uint(supplyState.block));
        if (deltaBlocks > 0 && supplySpeed > 0) {
            uint supplyTokens = BRToken(brToken).totalSupply();
            uint brainiacAccrued = mul_(deltaBlocks, supplySpeed);
            Double memory ratio = supplyTokens > 0 ? fraction(brainiacAccrued, supplyTokens) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: supplyState.index}), ratio);
            supplyState.index = safe224(index.mantissa, "new index overflows");
            supplyState.block = safe32(blockNumber, "block number overflows");
        } else if (deltaBlocks > 0) {
            supplyState.block = safe32(blockNumber, "block number overflows");
        }
    }

    function updateBrainiacBorrowIndex(BrainiacMarketState memory borrowState, address brToken, Exp memory marketBorrowIndex, ComptrollerInterface comptroller) internal view {
        uint borrowSpeed = comptroller.brainiacSpeeds(brToken);
        uint blockNumber = block.number;
        uint deltaBlocks = sub_(blockNumber, uint(borrowState.block));
        if (deltaBlocks > 0 && borrowSpeed > 0) {
            uint borrowAmount = div_(BRToken(brToken).totalBorrows(), marketBorrowIndex);
            uint brainiacAccrued = mul_(deltaBlocks, borrowSpeed);
            Double memory ratio = borrowAmount > 0 ? fraction(brainiacAccrued, borrowAmount) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: borrowState.index}), ratio);
            borrowState.index = safe224(index.mantissa, "new index overflows");
            borrowState.block = safe32(blockNumber, "block number overflows");
        } else if (deltaBlocks > 0) {
            borrowState.block = safe32(blockNumber, "block number overflows");
        }
    }

    function distributeSupplierBrainiac(
        BrainiacMarketState memory supplyState,
        address brToken,
        address supplier,
        ComptrollerInterface comptroller
    ) internal view returns (uint) {
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({mantissa: comptroller.brainiacSupplierIndex(brToken, supplier)});
        if (supplierIndex.mantissa == 0 && supplyIndex.mantissa > 0) {
            supplierIndex.mantissa = comptroller.brainiacInitialIndex();
        }

        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        uint supplierTokens = BRToken(brToken).balanceOf(supplier);
        uint supplierDelta = mul_(supplierTokens, deltaIndex);
        return supplierDelta;
    }

    function distributeBorrowerBrainiac(
        BrainiacMarketState memory borrowState,
        address brToken,
        address borrower,
        Exp memory marketBorrowIndex,
        ComptrollerInterface comptroller
    ) internal view returns (uint) {
        Double memory borrowIndex = Double({mantissa: borrowState.index});
        Double memory borrowerIndex = Double({mantissa: comptroller.brainiacBorrowerIndex(brToken, borrower)});
        if (borrowerIndex.mantissa > 0) {
            Double memory deltaIndex = sub_(borrowIndex, borrowerIndex);
            uint borrowerAmount = div_(BRToken(brToken).borrowBalanceStored(borrower), marketBorrowIndex);
            uint borrowerDelta = mul_(borrowerAmount, deltaIndex);
            return borrowerDelta;
        }
        return 0;
    }

    struct ClaimBrainiacLocalVariables {
        uint totalRewards;
        uint224 borrowIndex;
        uint32 borrowBlock;
        uint224 supplyIndex;
        uint32 supplyBlock;
    }

    function pendingBrainiac(address holder, ComptrollerInterface comptroller, BRToken[] calldata _brTokens) external returns (uint) {
        BRToken[] memory brTokens = _brTokens;
        ClaimBrainiacLocalVariables memory vars;
        for (uint i = 0; i < brTokens.length; i++) {
            (vars.borrowIndex, vars.borrowBlock) = comptroller.brainiacBorrowState(address(brTokens[i]));
            BrainiacMarketState memory borrowState = BrainiacMarketState({
                index: vars.borrowIndex,
                block: vars.borrowBlock
            });

            (vars.supplyIndex, vars.supplyBlock) = comptroller.brainiacSupplyState(address(brTokens[i]));
            BrainiacMarketState memory supplyState = BrainiacMarketState({
                index: vars.supplyIndex,
                block: vars.supplyBlock
            });

            Exp memory borrowIndex = Exp({mantissa: brTokens[i].borrowIndex()});
            updateBrainiacBorrowIndex(borrowState, address(brTokens[i]), borrowIndex, comptroller);
            uint reward = distributeBorrowerBrainiac(borrowState, address(brTokens[i]), holder, borrowIndex, comptroller);
            vars.totalRewards = add_(vars.totalRewards, reward);

            updateBrainiacSupplyIndex(supplyState, address(brTokens[i]), comptroller);
            reward = distributeSupplierBrainiac(supplyState, address(brTokens[i]), holder, comptroller);
            vars.totalRewards = add_(vars.totalRewards, reward);
        }
        return vars.totalRewards;
    }

    // utilities
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
