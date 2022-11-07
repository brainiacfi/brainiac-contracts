pragma solidity ^0.5.16;

import "../BAIController.sol";
import "./ComptrollerScenario.sol";

contract BAIControllerScenario is BAIController {
    uint blockNumber;
    address public brnAddress;
    address public baiAddress;

    constructor() BAIController() public {}

    function setBAIAddress(address baiAddress_) public {
        baiAddress = baiAddress_;
    }

    function getBAIAddress() public view returns (address) {
        return baiAddress;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }
}
