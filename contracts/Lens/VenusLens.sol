pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../VBep20.sol";
import "../VToken.sol";
import "../PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Governance/GovernorAlpha.sol";
import "../Governance/XVS.sol";
import "../Comptroller.sol";

interface LensInterface {
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (PriceOracle);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (VToken[] memory);
    function claimVenus(address) external;
    function venusAccrued(address) external view returns (uint);
}

contract VenusLens is ExponentialNoError {
    
    struct VenusMarketState {
        uint224 index;
        uint32 block;
    }

    struct VTokenMetadata {
        address vToken;
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
        uint vTokenDecimals;
        uint underlyingDecimals;
    }

    function vTokenMetadata(VToken vToken) public returns (VTokenMetadata memory) {
        uint exchangeRateCurrent = vToken.exchangeRateCurrent();
        LensInterface comptroller = LensInterface(address(vToken.comptroller()));
        (bool isListed, uint collateralFactorMantissa) = comptroller.markets(address(vToken));
        address underlyingAssetAddress;
        uint underlyingDecimals;

        if (compareStrings(vToken.symbol(), "vBNB")) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            VBep20 vBep20 = VBep20(address(vToken));
            underlyingAssetAddress = vBep20.underlying();
            underlyingDecimals = EIP20Interface(vBep20.underlying()).decimals();
        }

        return VTokenMetadata({
            vToken: address(vToken),
            exchangeRateCurrent: exchangeRateCurrent,
            supplyRatePerBlock: vToken.supplyRatePerBlock(),
            borrowRatePerBlock: vToken.borrowRatePerBlock(),
            reserveFactorMantissa: vToken.reserveFactorMantissa(),
            totalBorrows: vToken.totalBorrows(),
            totalReserves: vToken.totalReserves(),
            totalSupply: vToken.totalSupply(),
            totalCash: vToken.getCash(),
            isListed: isListed,
            collateralFactorMantissa: collateralFactorMantissa,
            underlyingAssetAddress: underlyingAssetAddress,
            vTokenDecimals: vToken.decimals(),
            underlyingDecimals: underlyingDecimals
        });
    }

    function vTokenMetadataAll(VToken[] calldata vTokens) external returns (VTokenMetadata[] memory) {
        uint vTokenCount = vTokens.length;
        VTokenMetadata[] memory res = new VTokenMetadata[](vTokenCount);
        for (uint i = 0; i < vTokenCount; i++) {
            res[i] = vTokenMetadata(vTokens[i]);
        }
        return res;
    }

    struct VTokenBalances {
        address vToken;
        uint balanceOf;
        uint borrowBalanceCurrent;
        uint balanceOfUnderlying;
        uint tokenBalance;
        uint tokenAllowance;
    }

    function vTokenBalances(VToken vToken, address payable account) public returns (VTokenBalances memory) {
        uint balanceOf = vToken.balanceOf(account);
        uint borrowBalanceCurrent = vToken.borrowBalanceCurrent(account);
        uint balanceOfUnderlying = vToken.balanceOfUnderlying(account);
        uint tokenBalance;
        uint tokenAllowance;

        if (compareStrings(vToken.symbol(), "vBNB")) {
            tokenBalance = account.balance;
            tokenAllowance = account.balance;
        } else {
            VBep20 vBep20 = VBep20(address(vToken));
            EIP20Interface underlying = EIP20Interface(vBep20.underlying());
            tokenBalance = underlying.balanceOf(account);
            tokenAllowance = underlying.allowance(account, address(vToken));
        }

        return VTokenBalances({
            vToken: address(vToken),
            balanceOf: balanceOf,
            borrowBalanceCurrent: borrowBalanceCurrent,
            balanceOfUnderlying: balanceOfUnderlying,
            tokenBalance: tokenBalance,
            tokenAllowance: tokenAllowance
        });
    }

    function vTokenBalancesAll(VToken[] calldata vTokens, address payable account) external returns (VTokenBalances[] memory) {
        uint vTokenCount = vTokens.length;
        VTokenBalances[] memory res = new VTokenBalances[](vTokenCount);
        for (uint i = 0; i < vTokenCount; i++) {
            res[i] = vTokenBalances(vTokens[i], account);
        }
        return res;
    }

    struct VTokenUnderlyingPrice {
        address vToken;
        uint underlyingPrice;
    }

    function vTokenUnderlyingPrice(VToken vToken) public view returns (VTokenUnderlyingPrice memory) {
        LensInterface comptroller = LensInterface(address(vToken.comptroller()));
        PriceOracle priceOracle = comptroller.oracle();

        return VTokenUnderlyingPrice({
            vToken: address(vToken),
            underlyingPrice: priceOracle.getUnderlyingPrice(vToken)
        });
    }

    function vTokenUnderlyingPriceAll(VToken[] calldata vTokens) external view returns (VTokenUnderlyingPrice[] memory) {
        uint vTokenCount = vTokens.length;
        VTokenUnderlyingPrice[] memory res = new VTokenUnderlyingPrice[](vTokenCount);
        for (uint i = 0; i < vTokenCount; i++) {
            res[i] = vTokenUnderlyingPrice(vTokens[i]);
        }
        return res;
    }

    struct AccountLimits {
        VToken[] markets;
        uint liquidity;
        uint shortfall;
    }

    function getAccountLimits(LensInterface comptroller, address account) public view returns (AccountLimits memory) {
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

    struct XVSBalanceMetadata {
        uint balance;
        uint votes;
        address delegate;
    }

    function getXVSBalanceMetadata(XVS xvs, address account) external view returns (XVSBalanceMetadata memory) {
        return XVSBalanceMetadata({
            balance: xvs.balanceOf(account),
            votes: uint256(xvs.getCurrentVotes(account)),
            delegate: xvs.delegates(account)
        });
    }

    struct XVSBalanceMetadataExt {
        uint balance;
        uint votes;
        address delegate;
        uint allocated;
    }

    function getXVSBalanceMetadataExt(XVS xvs, LensInterface comptroller, address account) external returns (XVSBalanceMetadataExt memory) {
        uint balance = xvs.balanceOf(account);
        comptroller.claimVenus(account);
        uint newBalance = xvs.balanceOf(account);
        uint accrued = comptroller.venusAccrued(account);
        uint total = add_(accrued, newBalance, "sum xvs total");
        uint allocated = sub_(total, balance, "sub allocated");

        return XVSBalanceMetadataExt({
            balance: balance,
            votes: uint256(xvs.getCurrentVotes(account)),
            delegate: xvs.delegates(account),
            allocated: allocated
        });
    }

    struct VenusVotes {
        uint blockNumber;
        uint votes;
    }

    function getVenusVotes(XVS xvs, address account, uint32[] calldata blockNumbers) external view returns (VenusVotes[] memory) {
        VenusVotes[] memory res = new VenusVotes[](blockNumbers.length);
        for (uint i = 0; i < blockNumbers.length; i++) {
            res[i] = VenusVotes({
                blockNumber: uint256(blockNumbers[i]),
                votes: uint256(xvs.getPriorVotes(account, blockNumbers[i]))
            });
        }
        return res;
    }

    // calculate the accurate pending Venus rewards without touching any storage
    function updateVenusSupplyIndex(VenusMarketState memory supplyState, address vToken, Comptroller comptroller) internal view {
        uint supplySpeed = comptroller.venusSpeeds(vToken);
        uint blockNumber = block.number;
        uint deltaBlocks = sub_(blockNumber, uint(supplyState.block));
        if (deltaBlocks > 0 && supplySpeed > 0) {
            uint supplyTokens = VToken(vToken).totalSupply();
            uint venusAccrued = mul_(deltaBlocks, supplySpeed);
            Double memory ratio = supplyTokens > 0 ? fraction(venusAccrued, supplyTokens) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: supplyState.index}), ratio);
            supplyState.index = safe224(index.mantissa, "new index overflows");
            supplyState.block = safe32(blockNumber, "block number overflows");
        } else if (deltaBlocks > 0) {
            supplyState.block = safe32(blockNumber, "block number overflows");
        }
    }

    function updateVenusBorrowIndex(VenusMarketState memory borrowState, address vToken, Exp memory marketBorrowIndex, Comptroller comptroller) internal view {
        uint borrowSpeed = comptroller.venusSpeeds(vToken);
        uint blockNumber = block.number;
        uint deltaBlocks = sub_(blockNumber, uint(borrowState.block));
        if (deltaBlocks > 0 && borrowSpeed > 0) {
            uint borrowAmount = div_(VToken(vToken).totalBorrows(), marketBorrowIndex);
            uint venusAccrued = mul_(deltaBlocks, borrowSpeed);
            Double memory ratio = borrowAmount > 0 ? fraction(venusAccrued, borrowAmount) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: borrowState.index}), ratio);
            borrowState.index = safe224(index.mantissa, "new index overflows");
            borrowState.block = safe32(blockNumber, "block number overflows");
        } else if (deltaBlocks > 0) {
            borrowState.block = safe32(blockNumber, "block number overflows");
        }
    }

    function distributeSupplierVenus(
        VenusMarketState memory supplyState, 
        address vToken, 
        address supplier, 
        Comptroller comptroller
    ) internal view returns (uint) {
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({mantissa: comptroller.venusSupplierIndex(vToken, supplier)});
        if (supplierIndex.mantissa == 0 && supplyIndex.mantissa > 0) {
            supplierIndex.mantissa = comptroller.venusInitialIndex();
        }
        
        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        uint supplierTokens = VToken(vToken).balanceOf(supplier);
        uint supplierDelta = mul_(supplierTokens, deltaIndex);
        return supplierDelta;
    }

    function distributeBorrowerVenus(
        VenusMarketState memory borrowState, 
        address vToken, 
        address borrower, 
        Exp memory marketBorrowIndex, 
        Comptroller comptroller
    ) internal view returns (uint) {
        Double memory borrowIndex = Double({mantissa: borrowState.index});
        Double memory borrowerIndex = Double({mantissa: comptroller.venusBorrowerIndex(vToken, borrower)});
        if (borrowerIndex.mantissa > 0) {
            Double memory deltaIndex = sub_(borrowIndex, borrowerIndex);
            uint borrowerAmount = div_(VToken(vToken).borrowBalanceStored(borrower), marketBorrowIndex);
            uint borrowerDelta = mul_(borrowerAmount, deltaIndex);
            return borrowerDelta;
        }
        return 0;
    }

    struct ClaimVenusLocalVariables {
        uint totalRewards;
        uint224 borrowIndex;
        uint32 borrowBlock;
        uint224 supplyIndex;
        uint32 supplyBlock;
    }

    function pendingVenus(address holder, Comptroller comptroller) external view returns (uint) {
        VToken[] memory vTokens = comptroller.getAllMarkets();
        ClaimVenusLocalVariables memory vars;
        for (uint i = 0; i < vTokens.length; i++) {
            (vars.borrowIndex, vars.borrowBlock) = comptroller.venusBorrowState(address(vTokens[i]));
            VenusMarketState memory borrowState = VenusMarketState({
                index: vars.borrowIndex,
                block: vars.borrowBlock
            });

            (vars.supplyIndex, vars.supplyBlock) = comptroller.venusSupplyState(address(vTokens[i]));
            VenusMarketState memory supplyState = VenusMarketState({
                index: vars.supplyIndex,
                block: vars.supplyBlock
            });

            Exp memory borrowIndex = Exp({mantissa: vTokens[i].borrowIndex()});
            updateVenusBorrowIndex(borrowState, address(vTokens[i]), borrowIndex, comptroller);
            uint reward = distributeBorrowerVenus(borrowState, address(vTokens[i]), holder, borrowIndex, comptroller);
            vars.totalRewards = add_(vars.totalRewards, reward);

            updateVenusSupplyIndex(supplyState, address(vTokens[i]), comptroller);
            reward = distributeSupplierVenus(supplyState, address(vTokens[i]), holder, comptroller);
            vars.totalRewards = add_(vars.totalRewards, reward);
        }
        return add_(comptroller.venusAccrued(holder), vars.totalRewards);
    }

    // utilities
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}