pragma solidity ^0.5.16;

import "../PriceOracle.sol";

contract FixedPriceOracle is PriceOracle {
    uint public price;

    constructor(uint _price) public {
        price = _price;
    }

    function getUnderlyingPrice(BRToken brToken) public view returns (uint) {
        brToken;
        return price;
    }

    function assetPrices(address asset) public view returns (uint) {
        asset;
        return price;
    }
}
