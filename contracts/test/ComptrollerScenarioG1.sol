pragma solidity ^0.5.16;

import "../ComptrollerG1.sol";

contract ComptrollerScenarioG1 is ComptrollerG1 {
    uint public blockNumber;
    address public brnAddress;
    address public baiAddress;

    constructor() ComptrollerG1() public {}

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
}
