"use strict";

const { dfn } = require('./JS');
const { 
  encodeParameters,
  ckbBalance,
  ckbMantissa,
  ckbUnsigned,
  mergeInterface
} = require('./BSC');

async function makeComptroller(opts = {}) {
  const {
    root = saddle.account,
    treasuryGuardian = saddle.accounts[4],
    treasuryAddress = saddle.accounts[4],
    kind = 'unitroller'
  } = opts || {};

  if (kind == 'bool') {
    const comptroller = await deploy('BoolComptroller');
    const brn = opts.brn || await deploy('BRN', [opts.brainiacOwner || root]);
    const bai = opts.bai || await makeBAI();

    const baiunitroller = await deploy('BAIUnitroller');
    const baicontroller = await deploy('BAIControllerHarness');
    
    await send(baiunitroller, '_setPendingImplementation', [baicontroller._address]);
    await send(baicontroller, '_become', [baiunitroller._address]);
    mergeInterface(baiunitroller, baicontroller);

    await send(baiunitroller, '_setComptroller', [comptroller._address]);
    await send(baiunitroller, 'setBAIAddress', [bai._address]);
    await send(baiunitroller, 'initialize');
    await send(bai, 'rely', [baiunitroller._address]);

    //await send(unitroller, '_setTreasuryData', [treasuryGuardian, treasuryAddress, 1e14]);

    return Object.assign(comptroller, { brn, bai, baicontroller: baiunitroller });
  }

  if (kind == 'boolFee') {
    const comptroller = await deploy('BoolComptroller');
    await send(comptroller, 'setTreasuryData', [treasuryGuardian, treasuryAddress, 1e14]);
    return comptroller;
  }

  if (kind == 'false-marker') {
    return await deploy('FalseMarkerMethodComptroller');
  }

  if (kind == 'v1-no-proxy') {
    const comptrollerLens = await deploy('ComptrollerLens');
    const comptroller = await deploy('ComptrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = ckbMantissa(dfn(opts.closeFactor, .051));

    await send(comptroller, '_setCloseFactor', [closeFactor]);
    await send(comptroller, '_setPriceOracle', [priceOracle._address]);
    await send(comptroller, '_setComptrollerLens', [comptrollerLens._address]);

    return Object.assign(comptroller, { priceOracle });
  }

  if (kind == 'unitroller-g2') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('ComptrollerScenarioG2');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = ckbMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = ckbMantissa(1);
    const brn = opts.brn || await deploy('BRN', [opts.compOwner || root]);
    const brainiacRate = ckbUnsigned(dfn(opts.brainiacRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, comptroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, 'harnessSetBrainiacRate', [brainiacRate]);
    await send(unitroller, 'setBRNAddress', [brn._address]); // harness only

    return Object.assign(unitroller, { priceOracle, brn });
  }

  if (kind == 'unitroller') {
    const comptrollerLens = await deploy('ComptrollerLens');
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('ComptrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = ckbMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = ckbMantissa(1);
    const brn = opts.brn || await deploy('BRN', [opts.brainiacOwner || root]);
    const bai = opts.bai || await makeBAI();
    const brainiacRate = ckbUnsigned(dfn(opts.brainiacRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, comptroller);

    const baiunitroller = await deploy('BAIUnitroller');
    const baicontroller = await deploy('BAIControllerHarness');
    
    await send(baiunitroller, '_setPendingImplementation', [baicontroller._address]);
    await send(baicontroller, '_become', [baiunitroller._address]);
    mergeInterface(baiunitroller, baicontroller);

    await send(unitroller, '_setBAIController', [baiunitroller._address]);
    await send(baiunitroller, '_setComptroller', [unitroller._address]);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, '_setComptrollerLens', [comptrollerLens._address]);
    await send(unitroller, 'setBRNAddress', [brn._address]); // harness only
    await send(baiunitroller, 'setBAIAddress', [bai._address]); // harness only
    await send(unitroller, 'harnessSetBrainiacRate', [brainiacRate]);
    await send(baiunitroller, 'initialize');
    await send(bai, 'rely', [baiunitroller._address]);

    await send(unitroller, '_setTreasuryData', [treasuryGuardian, treasuryAddress, 1e14]);

    return Object.assign(unitroller, { priceOracle, brn, bai, baiunitroller });
  }
}

async function makeBRToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'brerc20'
  } = opts || {};

  const comptroller = opts.comptroller || await makeComptroller(opts.comptrollerOpts);
  const interestRateModel = opts.interestRateModel || await makeInterestRateModel(opts.interestRateModelOpts);
  const exchangeRate = ckbMantissa(dfn(opts.exchangeRate, 1));
  const decimals = ckbUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || (kind === 'brckb' ? 'brCKB' : 'vOMG');
  const name = opts.name || `BRToken ${symbol}`;
  const admin = opts.admin || root;

  let brToken, underlying;
  let vDelegator, vDelegatee, vDaiMaker;

  switch (kind) {
    case 'brckb':
      brToken = await deploy('BRCKBHarness',
        [
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin
        ])
      break;

    case 'vdai':
      vDaiMaker  = await deploy('VDaiDelegateMakerHarness');
      underlying = vDaiMaker;
      vDelegatee = await deploy('VDaiDelegateHarness');
      vDelegator = await deploy('BRErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          vDelegatee._address,
          encodeParameters(['address', 'address'], [vDaiMaker._address, vDaiMaker._address])
        ]
      );
      brToken = await saddle.getContractAt('VDaiDelegateHarness', vDelegator._address);
      break;

    case 'brbrn':
      underlying = await deploy('BRN', [opts.compHolder || root]);
      vDelegatee = await deploy('VBrnLikeDelegate');
      vDelegator = await deploy('BRErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          vDelegatee._address,
          "0x0"
        ]
      );
      brToken = await saddle.getContractAt('VBrnLikeDelegate', vDelegator._address);
      break;

    case 'brerc20':
    default:
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      vDelegatee = await deploy('BRErc20DelegateHarness');
      vDelegator = await deploy('BRErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          vDelegatee._address,
          "0x0"
        ]
      );
      brToken = await saddle.getContractAt('BRErc20DelegateHarness', vDelegator._address);
      break;
  }

  if (opts.supportMarket) {
    await send(comptroller, '_supportMarket', [brToken._address]);
  }

  if (opts.addBrainiacMarket) {
    await send(comptroller, '_addBrainiacMarket', [brToken._address]);
  }

  if (opts.underlyingPrice) {
    const price = ckbMantissa(opts.underlyingPrice);
    await send(comptroller.priceOracle, 'setUnderlyingPrice', [brToken._address, price]);
  }

  if (opts.collateralFactor) {
    const factor = ckbMantissa(opts.collateralFactor);
    expect(await send(comptroller, '_setCollateralFactor', [brToken._address, factor])).toSucceed();
  }

  return Object.assign(brToken, { name, symbol, underlying, comptroller, interestRateModel });
}

async function makeBAI(opts = {}) {
  const {
    chainId = 97
  } = opts || {};

  let bai;

  bai = await deploy('BAIScenario',
    [
      chainId
    ]
  );

  return Object.assign(bai);
}

async function makeInterestRateModel(opts = {}) {
  const {
    root = saddle.account,
    kind = 'harnessed'
  } = opts || {};

  if (kind == 'harnessed') {
    const borrowRate = ckbMantissa(dfn(opts.borrowRate, 0));
    return await deploy('InterestRateModelHarness', [borrowRate]);
  }

  if (kind == 'false-marker') {
    const borrowRate = ckbMantissa(dfn(opts.borrowRate, 0));
    return await deploy('FalseMarkerMethodInterestRateModel', [borrowRate]);
  }

  if (kind == 'white-paper') {
    const baseRate = ckbMantissa(dfn(opts.baseRate, 0));
    const multiplier = ckbMantissa(dfn(opts.multiplier, 1e-18));
    return await deploy('WhitePaperInterestRateModel', [baseRate, multiplier]);
  }

  if (kind == 'jump-rate') {
    const baseRate = ckbMantissa(dfn(opts.baseRate, 0));
    const multiplier = ckbMantissa(dfn(opts.multiplier, 1e-18));
    const jump = ckbMantissa(dfn(opts.jump, 0));
    const kink = ckbMantissa(dfn(opts.kink, 0));
    return await deploy('JumpRateModel', [baseRate, multiplier, jump, kink]);
  }
}

async function makePriceOracle(opts = {}) {
  const {
    root = saddle.account,
    kind = 'simple'
  } = opts || {};

  if (kind == 'simple') {
    return await deploy('SimplePriceOracle');
  }
}

async function makeChainlinkOracle(opts = {}) {
  const {
    root = saddle.account
  } = opts || {};

  return await deploy('MockV3Aggregator', [opts.decimals, opts.initialAnswer]);
}

async function makeToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'erc20'
  } = opts || {};

  if (kind == 'erc20') {
    const quantity = ckbUnsigned(dfn(opts.quantity, 1e25));
    const decimals = ckbUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'OMG';
    const name = opts.name || `Erc20 ${symbol}`;
    return await deploy('ERC20Harness', [quantity, name, decimals, symbol]);
  }
}

async function balanceOf(token, account) {
  return ckbUnsigned(await call(token, 'balanceOf', [account]));
}

async function totalSupply(token) {
  return ckbUnsigned(await call(token, 'totalSupply'));
}

async function borrowSnapshot(brToken, account) {
  const { principal, interestIndex } = await call(brToken, 'harnessAccountBorrows', [account]);
  return { principal: ckbUnsigned(principal), interestIndex: ckbUnsigned(interestIndex) };
}

async function totalBorrows(brToken) {
  return ckbUnsigned(await call(brToken, 'totalBorrows'));
}

async function totalReserves(brToken) {
  return ckbUnsigned(await call(brToken, 'totalReserves'));
}

async function enterMarkets(brTokens, from) {
  return await send(brTokens[0].comptroller, 'enterMarkets', [brTokens.map(c => c._address)], { from });
}

async function fastForward(brToken, blocks = 5) {
  return await send(brToken, 'harnessFastForward', [blocks]);
}

async function setBalance(brToken, account, balance) {
  return await send(brToken, 'harnessSetBalance', [account, balance]);
}

async function setMintedBAIOf(comptroller, account, balance) {
  return await send(comptroller, 'harnessSetMintedBAIOf', [account, balance]);
}

async function setBAIBalance(bai, account, balance) {
  return await send(bai, 'harnessSetBalanceOf', [account, balance]);
}

async function setCKBBalance(brCkb, balance) {
  const current = await ckbBalance(brCkb._address);
  const root = saddle.account;
  expect(await send(brCkb, 'harnessDoTransferOut', [root, current])).toSucceed();
  expect(await send(brCkb, 'harnessDoTransferIn', [root, balance], { value: balance })).toSucceed();
}

async function getBalances(brTokens, accounts) {
  const balances = {};
  for (let brToken of brTokens) {
    const vBalances = balances[brToken._address] = {};
    for (let account of accounts) {
      vBalances[account] = {
        ckb: await ckbBalance(account),
        cash: brToken.underlying && await balanceOf(brToken.underlying, account),
        tokens: await balanceOf(brToken, account),
        borrows: (await borrowSnapshot(brToken, account)).principal
      };
    }
    vBalances[brToken._address] = {
      ckb: await ckbBalance(brToken._address),
      cash: brToken.underlying && await balanceOf(brToken.underlying, brToken._address),
      tokens: await totalSupply(brToken),
      borrows: await totalBorrows(brToken),
      reserves: await totalReserves(brToken)
    };
  }
  return balances;
}

async function getBalancesWithBAI(bai, brTokens, accounts) {
  const balances = {};
  for (let brToken of brTokens) {
    const vBalances = balances[brToken._address] = {};
    const baiBalancesData = balances[bai._address] = {};
    for (let account of accounts) {
      vBalances[account] = {
        ckb: await ckbBalance(account),
        cash: brToken.underlying && await balanceOf(brToken.underlying, account),
        tokens: await balanceOf(brToken, account),
        borrows: (await borrowSnapshot(brToken, account)).principal
      };
      baiBalancesData[account] = {
        bai: (await balanceOf(bai, account)),
      };
    }
    vBalances[brToken._address] = {
      ckb: await ckbBalance(brToken._address),
      cash: brToken.underlying && await balanceOf(brToken.underlying, brToken._address),
      tokens: await totalSupply(brToken),
      borrows: await totalBorrows(brToken),
      reserves: await totalReserves(brToken),
    };
  }
  return balances;
}

async function adjustBalances(balances, deltas) {
  for (let delta of deltas) {
    let brToken, account, key, diff;
    if (delta.length == 4) {
      ([brToken, account, key, diff] = delta);
    } else {
      ([brToken, key, diff] = delta);
      account = brToken._address;
    }
    balances[brToken._address][account][key] = balances[brToken._address][account][key].add(diff);
  }
  return balances;
}

async function adjustBalancesWithBAI(balances, deltas, bai) {
  for (let delta of deltas) {
    let brToken, account, key, diff;
    if (delta[0]._address != bai._address) {
      if (delta.length == 4) {
        ([brToken, account, key, diff] = delta);
      } else {
        ([brToken, key, diff] = delta);
        account = brToken._address;
      }
      balances[brToken._address][account][key] = balances[brToken._address][account][key].add(diff);
    } else {
      [brToken, account, key, diff] = delta;
      balances[bai._address][account][key] = balances[bai._address][account][key].add(diff);
    }
  }
  return balances;
}

async function preApprove(brToken, from, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    expect(await send(brToken.underlying, 'harnessSetBalance', [from, amount], { from })).toSucceed();
  }

  return send(brToken.underlying, 'approve', [brToken._address, amount], { from });
}

async function preApproveBAI(comptroller, bai, from, to, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    expect(await send(bai, 'harnessSetBalanceOf', [from, amount], { from })).toSucceed();
    await send(comptroller, 'harnessSetMintedBAIOf', [from, amount]);
  }

  return send(bai, 'approve', [to, amount], { from });
}

async function quickMint(brToken, minter, mintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(brToken, 1);

  if (dfn(opts.approve, true)) {
    expect(await preApprove(brToken, minter, mintAmount, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(brToken, 'mint', [mintAmount], { from: minter });
}

async function quickMintBAI(comptroller, bai, baiMinter, baiMintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(bai, 1);

  expect(await send(bai, 'harnessSetBalanceOf', [baiMinter, baiMintAmount], { baiMinter })).toSucceed();
  expect(await send(comptroller, 'harnessSetMintedBAIs', [baiMinter, baiMintAmount], { baiMinter })).toSucceed();
  expect(await send(bai, 'harnessIncrementTotalSupply', [baiMintAmount], { baiMinter })).toSucceed();
}

async function preSupply(brToken, account, tokens, opts = {}) {
  if (dfn(opts.total, true)) {
    expect(await send(brToken, 'harnessSetTotalSupply', [tokens])).toSucceed();
  }
  return send(brToken, 'harnessSetBalance', [account, tokens]);
}

async function quickRedeem(brToken, redeemer, redeemTokens, opts = {}) {
  await fastForward(brToken, 1);

  if (dfn(opts.supply, true)) {
    expect(await preSupply(brToken, redeemer, redeemTokens, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(brToken, 'redeem', [redeemTokens], { from: redeemer });
}

async function quickRedeemUnderlying(brToken, redeemer, redeemAmount, opts = {}) {
  await fastForward(brToken, 1);

  if (dfn(opts.exchangeRate)) {
    expect(await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(brToken, 'redeemUnderlying', [redeemAmount], { from: redeemer });
}

async function setOraclePrice(brToken, price) {
  return send(brToken.comptroller.priceOracle, 'setUnderlyingPrice', [brToken._address, ckbMantissa(price)]);
}

async function setOraclePriceFromMantissa(brToken, price) {
  return send(brToken.comptroller.priceOracle, 'setUnderlyingPrice', [brToken._address, price]);
}

async function setBorrowRate(brToken, rate) {
  return send(brToken.interestRateModel, 'setBorrowRate', [ckbMantissa(rate)]);
}

async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
  return call(interestRateModel, 'getBorrowRate', [cash, borrows, reserves].map(ckbUnsigned));
}

async function getSupplyRate(interestRateModel, cash, borrows, reserves, reserveFactor) {
  return call(interestRateModel, 'getSupplyRate', [cash, borrows, reserves, reserveFactor].map(ckbUnsigned));
}

async function pretendBorrow(brToken, borrower, accountIndex, marketIndex, principalRaw, blockNumber = 2e7) {
  await send(brToken, 'harnessSetTotalBorrows', [ckbUnsigned(principalRaw)]);
  await send(brToken, 'harnessSetAccountBorrows', [borrower, ckbUnsigned(principalRaw), ckbMantissa(accountIndex)]);
  await send(brToken, 'harnessSetBorrowIndex', [ckbMantissa(marketIndex)]);
  await send(brToken, 'harnessSetAccrualBlockNumber', [ckbUnsigned(blockNumber)]);
  await send(brToken, 'harnessSetBlockNumber', [ckbUnsigned(blockNumber)]);
}

async function pretendBAIMint(comptroller, baicontroller, bai, baiMinter, principalRaw, totalSupply, blockNumber = 2e7) {
  await send(comptroller, 'harnessSetMintedBAIOf', [baiMinter, ckbUnsigned(principalRaw)]);
  await send(bai, 'harnessIncrementTotalSupply', [ckbUnsigned(principalRaw)]);
  await send(bai, 'harnessSetBalanceOf', [baiMinter, ckbUnsigned(principalRaw)]);
  await send(baicontroller, 'harnessSetBlockNumber', [ckbUnsigned(blockNumber)]);
}

module.exports = {
  makeComptroller,
  makeBRToken,
  makeBAI,
  makeInterestRateModel,
  makePriceOracle,
  makeChainlinkOracle,
  makeToken,

  balanceOf,
  totalSupply,
  borrowSnapshot,
  totalBorrows,
  totalReserves,
  enterMarkets,
  fastForward,
  setBalance,
  setMintedBAIOf,
  setBAIBalance,
  setCKBBalance,
  getBalances,
  getBalancesWithBAI,
  adjustBalances,
  adjustBalancesWithBAI,

  preApprove,
  preApproveBAI,
  quickMint,
  quickMintBAI,

  preSupply,
  quickRedeem,
  quickRedeemUnderlying,

  setOraclePrice,
  setOraclePriceFromMantissa,
  setBorrowRate,
  getBorrowRate,
  getSupplyRate,
  pretendBorrow,
  pretendBAIMint
};
