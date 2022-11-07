pragma solidity ^0.5.16;

import "../ComptrollerG2.sol";

contract ComptrollerScenarioG2 is ComptrollerG2 {
    uint public blockNumber;

    constructor() ComptrollerG2() public {}

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
