pragma solidity ^0.5.16;

import "../Comptroller.sol";

contract ComptrollerScenario is Comptroller {
    uint public blockNumber;
    address public brnAddress;
    address public baiAddress;

    constructor() Comptroller() public {}

    function setBRNAddress(address brnAddress_) public {
        brnAddress = brnAddress_;
    }

    function getBRNAddress() public view returns (address) {
        return brnAddress;
    }

    function setBAIAddress(address baiAddress_) public {
        baiAddress = baiAddress_;
    }

    function getBAIAddress() public view returns (address) {
        return baiAddress;
    }

    function membershipLength(BRToken brToken) public view returns (uint) {
        return accountAssets[address(brToken)].length;
    }

    function fastForward(uint blocks) public returns (uint) {
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
            if (markets[address(allMarkets[i])].isBrainiac) {
                n++;
            }
        }

        address[] memory brainiacMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isBrainiac) {
                brainiacMarkets[k++] = address(allMarkets[i]);
            }
        }
        return brainiacMarkets;
    }

    function unlist(BRToken brToken) public {
        markets[address(brToken)].isListed = false;
    }

    /**
     * @notice Recalculate and update BRN speeds for all BRN markets
     */
    function refreshBrainiacSpeeds() public {
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
}
