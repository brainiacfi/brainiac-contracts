pragma solidity ^0.5.16;

import "./BRCKB.sol";

/**
 * @title Brainiac's Maximillion Contract
 * @author Brainiac
 */
contract Maximillion {
    /**
     * @notice The default brCkb market to repay in
     */
    BRCKB public brCkb;

    /**
     * @notice Construct a Maximillion to repay max in a BRCKB market
     */
    constructor(BRCKB brCkb_) public {
        brCkb = brCkb_;
    }

    /**
     * @notice msg.sender sends CKB to repay an account's borrow in the brCkb market
     * @dev The provided CKB is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, brCkb);
    }

    /**
     * @notice msg.sender sends CKB to repay an account's borrow in a brCkb market
     * @dev The provided CKB is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param brCkb_ The address of the brCkb contract to repay in
     */
    function repayBehalfExplicit(address borrower, BRCKB brCkb_) public payable {
        uint received = msg.value;
        uint borrows = brCkb_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            brCkb_.repayBorrowBehalf.value(borrows)(borrower);
            msg.sender.transfer(received - borrows);
        } else {
            brCkb_.repayBorrowBehalf.value(received)(borrower);
        }
    }
}
