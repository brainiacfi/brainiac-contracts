import {Contract} from '../Contract';
import {Callable, Sendable} from '../Invokation';
import {encodedNumber} from '../Encoding';

interface ComptrollerMethods {
  getAccountLiquidity(string): Callable<{0: number, 1: number, 2: number}>
  getHypotheticalAccountLiquidity(account: string, asset: string, redeemTokens: encodedNumber, borrowAmount: encodedNumber): Callable<{0: number, 1: number, 2: number}>
  membershipLength(string): Callable<string>
  checkMembership(user: string, brToken: string): Callable<string>
  getAssetsIn(string): Callable<string[]>
  admin(): Callable<string>
  oracle(): Callable<string>
  maxAssets(): Callable<number>
  liquidationIncentiveMantissa(): Callable<number>
  closeFactorMantissa(): Callable<number>
  getBlockNumber(): Callable<number>
  collateralFactor(string): Callable<string>
  markets(string): Callable<{0: boolean, 1: number, 2?: boolean}>
  _setMaxAssets(encodedNumber): Sendable<number>
  _setLiquidationIncentive(encodedNumber): Sendable<number>
  _setLiquidatorContract(string): Sendable<void>
  _supportMarket(string): Sendable<number>
  _setPriceOracle(string): Sendable<number>
  _setCollateralFactor(string, encodedNumber): Sendable<number>
  _setCloseFactor(encodedNumber): Sendable<number>
  _setBAIMintRate(encodedNumber): Sendable<number>
  _setBAIController(string): Sendable<number>
  enterMarkets(markets: string[]): Sendable<number>
  exitMarket(market: string): Sendable<number>
  fastForward(encodedNumber): Sendable<number>
  _setComptrollerLens(string): Sendable<number>
  _setPendingImplementation(string): Sendable<number>
  comptrollerImplementation(): Callable<string>
  unlist(string): Sendable<void>
  admin(): Callable<string>
  pendingAdmin(): Callable<string>
  _setPendingAdmin(string): Sendable<number>
  _acceptAdmin(): Sendable<number>
  _setProtocolPaused(bool): Sendable<number>
  protocolPaused(): Callable<boolean>
  _addBrainiacMarkets(markets: string[]): Sendable<void>
  _dropBrainiacMarket(market: string): Sendable<void>
  getBrainiacMarkets(): Callable<string[]>
  refreshBrainiacSpeeds(): Sendable<void>
  brainiacRate(): Callable<number>
  brainiacSupplyState(string): Callable<string>
  brainiacBorrowState(string): Callable<string>
  brainiacAccrued(string): Callable<string>
  brainiacSupplierIndex(market: string, account: string): Callable<string>
  brainiacBorrowerIndex(market: string, account: string): Callable<string>
  brainiacSpeeds(string): Callable<string>
  claimBrainiac(string): Sendable<void>
  _grantBRN(account: string, encodedNumber): Sendable<void>
  _setBrainiacRate(encodedNumber): Sendable<void>
  _setBrainiacSpeed(brToken: string, encodedNumber): Sendable<void>
  mintedBAIs(string): Callable<number>
  _setMarketBorrowCaps(brTokens:string[], borrowCaps:encodedNumber[]): Sendable<void>
  _setBorrowCapGuardian(string): Sendable<void>
  borrowCapGuardian(): Callable<string>
  borrowCaps(string): Callable<string>
  _setTreasuryData(guardian, address, percent: encodedNumber): Sendable<number>
}

export interface Comptroller extends Contract {
  methods: ComptrollerMethods
}
