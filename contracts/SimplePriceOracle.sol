pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./BRErc20.sol";

contract SimplePriceOracle is PriceOracle {
    mapping(address => uint) prices;
    event PricePosted(address asset, uint previousPriceMantissa, uint requestedPriceMantissa, uint newPriceMantissa);

    function getUnderlyingPrice(BRToken brToken) public view returns (uint) {
        if (compareStrings(brToken.symbol(), "brCKB")) {
            return 1e18;
        } else if (compareStrings(brToken.symbol(), "BAI")) {
            return prices[address(brToken)];
        } else {
            return prices[address(BRErc20(address(brToken)).underlying())];
        }
    }

    function setUnderlyingPrice(BRToken brToken, uint underlyingPriceMantissa) public {
        address asset = address(BRErc20(address(brToken)).underlying());
        emit PricePosted(asset, prices[asset], underlyingPriceMantissa, underlyingPriceMantissa);
        prices[asset] = underlyingPriceMantissa;
    }

    function setDirectPrice(address asset, uint price) public {
        emit PricePosted(asset, prices[asset], price, price);
        prices[asset] = price;
    }

    // v1 price oracle interface for use as backing of proxy
    function assetPrices(address asset) external view returns (uint) {
        return prices[asset];
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
