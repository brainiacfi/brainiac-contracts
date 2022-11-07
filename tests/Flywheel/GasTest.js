const {
  makeComptroller,
  makeBRToken
} = require('../Utils/Brainiac');
const {
  ckbExp,
  ckbDouble,
  ckbUnsigned
} = require('../Utils/BSC');


// NB: coverage doesn't like this
describe.skip('Flywheel trace ops', () => {
  let root, a1, a2, a3, accounts;
  let comptroller, market;
  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller();
    market = await makeBRToken({comptroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    await send(comptroller, '_addBrainiacMarkets', [[market].map(c => c._address)]);
  });

  it('update supply index SSTOREs', async () => {
    await send(comptroller, 'setBlockNumber', [100]);
    await send(market, 'harnessSetTotalBorrows', [ckbUnsigned(11e18)]);
    await send(comptroller, 'setBrainiacSpeed', [market._address, ckbExp(0.5)]);

    const tx = await send(comptroller, 'harnessUpdateBrainiacSupplyIndex', [market._address]);

    const ops = {};
    await saddle.trace(tx, {
      execLog: log => {
        if (log.lastLog != undefined) {
          ops[log.op] = (ops[log.op] || []).concat(log);
        }
      }
    });
    expect(ops.SSTORE.length).toEqual(1);
  });

  it('update borrow index SSTOREs', async () => {
    await send(comptroller, 'setBlockNumber', [100]);
    await send(market, 'harnessSetTotalBorrows', [ckbUnsigned(11e18)]);
    await send(comptroller, 'setBrainiacSpeed', [market._address, ckbExp(0.5)]);

    const tx = await send(comptroller, 'harnessUpdateBrainiacBorrowIndex', [market._address, ckbExp(1.1)]);

    const ops = {};
    await saddle.trace(tx, {
      execLog: log => {
        if (log.lastLog != undefined) {
          ops[log.op] = (ops[log.op] || []).concat(log);
        }
      }
    });
    expect(ops.SSTORE.length).toEqual(1);
  });
});