pragma solidity ^0.5.16;

import "./BRErc20Delegate.sol";

interface BrnLike {
  function delegate(address delegatee) external;
}

/**
 * @title Brainiac's VBrnLikeDelegate Contract
 * @notice BRTokens which can 'delegate votes' of their underlying BEP-20
 * @author Brainiac
 */
contract VBrnLikeDelegate is BRErc20Delegate {
  /**
   * @notice Construct an empty delegate
   */
  constructor() public BRErc20Delegate() {}

  /**
   * @notice Admin call to delegate the votes of the BRN-like underlying
   * @param brnLikeDelegatee The address to delegate votes to
   */
  function _delegateBrnLikeTo(address brnLikeDelegatee) external {
    require(msg.sender == admin, "only the admin may set the brn-like delegate");
    BrnLike(underlying).delegate(brnLikeDelegatee);
  }
}