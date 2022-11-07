pragma solidity ^0.5.16;

import "./BRToken.sol";

contract BAIControllerInterface {
    function getBAIAddress() public view returns (address);
    function getMintableBAI(address minter) public view returns (uint, uint);
    function mintBAI(address minter, uint mintBAIAmount) external returns (uint);
    function repayBAI(address repayer, uint repayBAIAmount) external returns (uint);
    function liquidateBAI(address borrower, uint repayAmount, BRTokenInterface brTokenCollateral) external returns (uint, uint);

    function _initializeBrainiacBAIState(uint blockNumber) external returns (uint);
    function updateBrainiacBAIMintIndex() external returns (uint);
    function calcDistributeBAIMinterBrainiac(address baiMinter) external returns(uint, uint, uint, uint);
}
