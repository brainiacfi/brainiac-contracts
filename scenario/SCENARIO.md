
# Types
* `name:<Type>` - Helper to describe arguments with names, not actually input this way
* `<Bool>` - `True` or `False`
* `<Number>` - A standard number (e.g. `5` or `6.0` or `10.0e18`)
* `<BRToken>` - The local name for a given brToken when created, e.g. `vZRX`
* `<User>` - One of: `Admin, Bank, Geoff, Torrey, Robert, Coburn, Jared`
* `<String>` - A string, may be quoted but does not have to be if a single-word (e.g. `"Mint"` or `Mint`)
* `<Address>` - TODO
* `<Assertion>` - See assertions below.

# Events

## Core Events

* "History n:<Number>=5" - Prints history of actions
  * E.g. "History"
  * E.g. "History 10"
* `Read ...` - Reads given value and prints result
  * E.g. `Read BRToken vBAT ExchangeRateStored` - Returns exchange rate of vBAT
* `Assert <Assertion>` - Validates given assertion, raising an exception if assertion fails
  * E.g. `Assert Equal (Erc20 BAT TokenBalance Geoff) (Exactly 5.0)` - Returns exchange rate of vBAT
* `FastForward n:<Number> Blocks` - For `BRTokenScenario`, moves the block number forward n blocks. Note: in `BRTokenScenario` the current block number is mocked (starting at 100000). Thus, this is the only way for the protocol to see a higher block number (for accruing interest).
  * E.g. `FastForward 5 Blocks` - Move block number forward 5 blocks.
* `Inspect` - Prints debugging information about the world
* `Debug message:<String>` - Same as inspect but prepends with a string
* `From <User> <Event>` - Runs event as the given user
  * E.g. `From Geoff (BRToken vZRX Mint 5e18)`
* `Invariant <Invariant>` - Adds a new invariant to the world which is checked after each transaction
  * E.g. `Invariant Static (BRToken vZRX TotalSupply)`
* `WipeInvariants` - Removes all invariants.
* `Comptroller <ComptrollerEvent>` - Runs given Comptroller event
  * E.g. `Comptroller _setReserveFactor 0.5`
* `BRToken <BRTokenEvent>` - Runs given BRToken event
  * E.g. `BRToken vZRX Mint 5e18`
* `Erc20 <Erc20Event>` - Runs given Erc20 event
  * E.g. `Erc20 ZRX Facuet Geoff 5e18`
* `InterestRateModel ...event` - Runs given interest rate model event
  * E.g. `InterestRateModel Deployed (Fixed 0.5)`
* `PriceOracle <PriceOracleEvent>` - Runs given Price Oracle event
  * E.g. `PriceOracle SetPrice vZRX 1.5`

## Comptroller Events

* "Comptroller Deploy ...comptrollerParams" - Generates a new Comptroller
  * E.g. "Comptroller Deploy Scenario (PriceOracle Address) 0.1 10"
* `Comptroller SetPaused action:<String> paused:<Bool>` - Pauses or unpaused given brToken function (e.g. Mint)
  * E.g. `Comptroller SetPaused Mint True`
* `Comptroller SupportMarket <BRToken>` - Adds support in the Comptroller for the given brToken
  * E.g. `Comptroller SupportMarket vZRX`
* `Comptroller EnterMarkets <User> <BRToken> ...` - User enters the given markets
  * E.g. `Comptroller EnterMarkets Geoff vZRX brCKB`
* `Comptroller SetMaxAssets <Number>` - Sets (or resets) the max allowed asset count
  * E.g. `Comptroller SetMaxAssets 4`
* `BRToken <brToken> SetOracle oracle:<Contract>` - Sets the oracle
  * E.g. `Comptroller SetOracle (Fixed 1.5)`
* `Comptroller SetCollateralFactor <BRToken> <Number>` - Sets the collateral factor for given brToken to number
  * E.g. `Comptroller SetCollateralFactor vZRX 0.1`
* `FastForward n:<Number> Blocks` - Moves the block number forward `n` blocks. Note: in `BRTokenScenario` and `ComptrollerScenario` the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
  * E.g. `Comptroller FastForward 5 Blocks` - Move block number forward 5 blocks.

## brToken Events

* `BRToken Deploy name:<BRToken> underlying:<Contract> comptroller:<Contract> interestRateModel:<Contract> initialExchangeRate:<Number> decimals:<Number> admin:<Address>` - Generates a new comptroller and sets to world global
  * E.g. `BRToken Deploy vZRX (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 18`
* `BRToken <brToken> AccrueInterest` - Accrues interest for given token
  * E.g. `BRToken vZRX AccrueInterest`
* `BRToken <brToken> Mint <User> amount:<Number>` - Mints the given amount of brToken as specified user
  * E.g. `BRToken vZRX Mint Geoff 1.0`
* `BRToken <brToken> Redeem <User> amount:<Number>` - Redeems the given amount of brToken as specified user
      * E.g. `BRToken vZRX Redeem Geoff 1.0e18`
* `BRToken <brToken> Borrow <User> amount:<Number>` - Borrows the given amount of this brToken as specified user
      * E.g. `BRToken vZRX Borrow Geoff 1.0e18`
* `BRToken <brToken> ReduceReserves amount:<Number>` - Reduces the reserves of the brToken
      * E.g. `BRToken vZRX ReduceReserves 1.0e18`
* `BRToken <brToken> SetReserveFactor amount:<Number>` - Sets the reserve factor for the brToken
      * E.g. `BRToken vZRX SetReserveFactor 0.1`
* `BRToken <brToken> SetInterestRateModel interestRateModel:<Contract>` - Sets the interest rate model for the given brToken
  * E.g. `BRToken vZRX SetInterestRateModel (Fixed 1.5)`
* `BRToken <brToken> SetComptroller comptroller:<Contract>` - Sets the comptroller for the given brToken
  * E.g. `BRToken vZRX SetComptroller Comptroller`
* `BRToken <brToken> Mock variable:<String> value:<Number>` - Mocks a given value on brToken. Note: value must be a supported mock and this will only work on a BRTokenScenario contract.
  * E.g. `BRToken vZRX Mock totalBorrows 5.0e18`
  * E.g. `BRToken vZRX Mock totalReserves 0.5e18`

## Erc-20 Events

* `Erc20 Deploy name:<Erc20>` - Generates a new BEP-20 token by name
  * E.g. `Erc20 Deploy ZRX`
* `Erc20 <Erc20> Approve <User> <Address> <Amount>` - Adds an allowance between user and address
  * E.g. `Erc20 ZRX Approve Geoff vZRX 1.0e18`
* `Erc20 <Erc20> Faucet <Address> <Amount>` - Adds an arbitrary balance to given user
  * E.g. `Erc20 ZRX Facuet Geoff 1.0e18`

## Price Oracle Events

* `Deploy` - Generates a new price oracle (note: defaults to (Fixed 1.0))
  * E.g. `PriceOracle Deploy (Fixed 1.0)`
  * E.g. `PriceOracle Deploy Simple`
  * E.g. `PriceOracle Deploy NotPriceOracle`
* `SetPrice <BRToken> <Amount>` - Sets the per-ckb price for the given brToken
  * E.g. `PriceOracle SetPrice vZRX 1.0`

## Interest Rate Model Events

## Deploy

* `Deploy params:<String[]>` - Generates a new interest rate model (note: defaults to (Fixed 0.25))
  * E.g. `InterestRateModel Deploy (Fixed 0.5)`
  * E.g. `InterestRateModel Deploy Whitepaper`

# Values

## Core Values

* `True` - Returns true
* `False` - Returns false
* `Zero` - Returns 0
* `Some` - Returns 100e18
* `Little` - Returns 100e10
* `Exactly <Amount>` - Returns a strict numerical value
  * E.g. `Exactly 5.0`
* `Exp <Amount>` - Returns the mantissa for a given exp
  * E.g. `Exp 5.5`
* `Precisely <Amount>` - Matches a number to given number of significant figures
  * E.g. `Exactly 5.1000` - Matches to 5 sig figs
* `Anything` - Matches anything
* `Nothing` - Matches nothing
* `Default value:<Value> default:<Value>` - Returns value if truthy, otherwise default. Note: this does short-circuit
* `LastContract` - Returns the address of last constructed contract
* `User <...>` - Returns User value (see below)
* `Comptroller <...>` - Returns Comptroller value (see below)
* `BRToken <...>` - Returns BRToken value (see below)
* `Erc20 <...>` - Returns Erc20 value (see below)
* `InterestRateModel <...>` - Returns InterestRateModel value (see below)
* `PriceOracle <...>` - Returns PriceOracle value (see below)

## User Values

* `User <User> Address` - Returns address of user
  * E.g. `User Geoff Address` - Returns Geoff's address

## Comptroller Values

* `Comptroller Liquidity <User>` - Returns a given user's trued up liquidity
  * E.g. `Comptroller Liquidity Geoff`
* `Comptroller MembershipLength <User>` - Returns a given user's length of membership
  * E.g. `Comptroller MembershipLength Geoff`
* `Comptroller CheckMembership <User> <BRToken>` - Returns one if user is in asset, zero otherwise.
  * E.g. `Comptroller CheckMembership Geoff vZRX`
* "Comptroller CheckListed <BRToken>" - Returns true if market is listed, false otherwise.
  * E.g. "Comptroller CheckListed vZRX"

## BRToken Values
* `BRToken <BRToken> UnderlyingBalance <User>` - Returns a user's underlying balance (based on given exchange rate)
  * E.g. `BRToken vZRX UnderlyingBalance Geoff`
* `BRToken <BRToken> BorrowBalance <User>` - Returns a user's borrow balance (including interest)
  * E.g. `BRToken vZRX BorrowBalance Geoff`
* `BRToken <BRToken> TotalBorrowBalance` - Returns the brToken's total borrow balance
  * E.g. `BRToken vZRX TotalBorrowBalance`
* `BRToken <BRToken> Reserves` - Returns the brToken's total reserves
  * E.g. `BRToken vZRX Reserves`
* `BRToken <BRToken> Comptroller` - Returns the brToken's comptroller
  * E.g. `BRToken vZRX Comptroller`
* `BRToken <BRToken> PriceOracle` - Returns the brToken's price oracle
  * E.g. `BRToken vZRX PriceOracle`
* `BRToken <BRToken> ExchangeRateStored` - Returns the brToken's exchange rate (based on balances stored)
  * E.g. `BRToken vZRX ExchangeRateStored`
* `BRToken <BRToken> ExchangeRate` - Returns the brToken's current exchange rate
  * E.g. `BRToken vZRX ExchangeRate`

## Erc-20 Values

* `Erc20 <Erc20> Address` - Returns address of BEP-20 contract
  * E.g. `Erc20 ZRX Address` - Returns ZRX's address
* `Erc20 <Erc20> Name` - Returns name of BEP-20 contract
  * E.g. `Erc20 ZRX Address` - Returns ZRX's name
* `Erc20 <Erc20> Symbol` - Returns symbol of BEP-20 contract
  * E.g. `Erc20 ZRX Symbol` - Returns ZRX's symbol
* `Erc20 <Erc20> Decimals` - Returns number of decimals in BEP-20 contract
  * E.g. `Erc20 ZRX Decimals` - Returns ZRX's decimals
* `Erc20 <Erc20> TotalSupply` - Returns the BEP-20 token's total supply
  * E.g. `Erc20 ZRX TotalSupply`
  * E.g. `Erc20 vZRX TotalSupply`
* `Erc20 <Erc20> TokenBalance <Address>` - Returns the BEP-20 token balance of a given address
  * E.g. `Erc20 ZRX TokenBalance Geoff` - Returns a user's ZRX balance
  * E.g. `Erc20 vZRX TokenBalance Geoff` - Returns a user's vZRX balance
  * E.g. `Erc20 ZRX TokenBalance vZRX` - Returns vZRX's ZRX balance
* `Erc20 <Erc20> Allowance owner:<Address> spender:<Address>` - Returns the BEP-20 allowance from owner to spender
  * E.g. `Erc20 ZRX Allowance Geoff Torrey` - Returns the ZRX allowance of Geoff to Torrey
  * E.g. `Erc20 vZRX Allowance Geoff Coburn` - Returns the vZRX allowance of Geoff to Coburn
  * E.g. `Erc20 ZRX Allowance Geoff vZRX` - Returns the ZRX allowance of Geoff to the vZRX brToken

## PriceOracle Values

* `Address` - Gets the address of the global price oracle
* `Price asset:<Address>` - Gets the price of the given asset

## Interest Rate Model Values

* `Address` - Gets the address of the global interest rate model

# Assertions

* `Equal given:<Value> expected:<Value>` - Asserts that given matches expected.
  * E.g. `Assert Equal (Exactly 0) Zero`
  * E.g. `Assert Equal (BRToken vZRX TotalSupply) (Exactly 55)`
  * E.g. `Assert Equal (BRToken vZRX Comptroller) (Comptroller Address)`
* `True given:<Value>` - Asserts that given is true.
  * E.g. `Assert True (Comptroller CheckMembership Geoff brCKB)`
* `False given:<Value>` - Asserts that given is false.
  * E.g. `Assert False (Comptroller CheckMembership Geoff brCKB)`
* `Failure error:<String> info:<String> detail:<Number?>` - Asserts that last transaction had a graceful failure with given error, info and detail.
  * E.g. `Assert Failure UNAUTHORIZED SUPPORT_MARKET_OWNER_CHECK`
  * E.g. `Assert Failure MATH_ERROR MINT_CALCULATE_BALANCE 5`
* `Revert` - Asserts that the last transaction reverted.
* `Success` - Asserts that the last transaction completed successfully (that is, did not revert nor emit graceful failure).
* `Log name:<String> ((key:<String> value:<Value>) ...)` - Asserts that last transaction emitted log with given name and key-value pairs.
  * E.g. `Assert Log Minted (("account" (User Geoff address)) ("amount" (Exactly 55)))`
