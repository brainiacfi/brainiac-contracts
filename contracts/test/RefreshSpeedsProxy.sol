pragma solidity ^0.5.16;

interface IComptroller {
	function refreshBrainiacSpeeds() external;
}

contract RefreshSpeedsProxy {
	constructor(address comptroller) public {
		IComptroller(comptroller).refreshBrainiacSpeeds();
	}
}
