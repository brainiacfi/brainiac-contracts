pragma solidity ^0.5.16;

import "../BAIController.sol";

contract BAIControllerHarness is BAIController {
    address baiAddress;
    uint public blockNumber;

    constructor() BAIController() public {
        admin = msg.sender;
    }

    function setBrainiacBAIState(uint224 index, uint32 blockNumber_) public {
        brainiacBAIState.index = index;
        brainiacBAIState.block = blockNumber_;
    }

    function setBAIAddress(address baiAddress_) public {
        baiAddress = baiAddress_;
    }

    function getBAIAddress() public view returns (address) {
        return baiAddress;
    }

    function harnessRepayBAIFresh(address payer, address account, uint repayAmount) public returns (uint) {
       (uint err,) = repayBAIFresh(payer, account, repayAmount);
       return err;
    }

    function harnessLiquidateBAIFresh(address liquidator, address borrower, uint repayAmount, BRToken brTokenCollateral) public returns (uint) {
        (uint err,) = liquidateBAIFresh(liquidator, borrower, repayAmount, brTokenCollateral);
        return err;
    }

    function harnessFastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function harnessSetBlockNumber(uint newBlockNumber) public {
        blockNumber = newBlockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }
}
