pragma solidity ^0.5.16;

import "../Utils/SafeMath.sol";
import "../Utils/IERC20.sol";
import "./IBRNVesting.sol";

contract VRTConverterAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of VRTConverter
    */
    address public implementation;

    /**
    * @notice Pending brains of VRTConverter
    */
    address public pendingImplementation;
}

contract VRTConverterStorage is VRTConverterAdminStorage {

    /// @notice Guard variable for re-entrancy checks
    bool public _notEntered;

    /// @notice indicator to check if the contract is initialized
    bool public initialized;

    /// @notice The VRT TOKEN!
    IERC20 public vrt;

    /// @notice The BRN TOKEN!
    IERC20 public brn;

    /// @notice BRNVesting Contract reference
    IBRNVesting public brnVesting;

    /// @notice Conversion ratio from VRT to BRN with decimal 18
    uint256 public conversionRatio;

    /// @notice total VRT converted to BRN
    uint256 public totalVrtConverted;

    /// @notice Conversion Start time in EpochSeconds
    uint256 public conversionStartTime;

    /// @notice ConversionPeriod in Seconds
    uint256 public conversionPeriod;

    /// @notice Conversion End time in EpochSeconds
    uint256 public conversionEndTime;
}