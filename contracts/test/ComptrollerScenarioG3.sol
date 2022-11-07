pragma solidity ^0.5.16;

import "../ComptrollerG3.sol";

contract ComptrollerScenarioG3 is ComptrollerG3 {
    uint public blockNumber;

    constructor() ComptrollerG3() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function membershipLength(BRToken brToken) public view returns (uint) {
        return accountAssets[address(brToken)].length;
    }

    function unlist(BRToken brToken) public {
        markets[address(brToken)].isListed = false;
    }

    function setBrainiacSpeed(address brToken, uint brainiacSpeed) public {
        brainiacSpeeds[brToken] = brainiacSpeed;
    }
}
