const {
  makeComptroller,
  makeBRToken,
  balanceOf,
  fastForward,
  pretendBorrow,
  quickMint,
  enterMarkets,
  makeToken,
} = require('../Utils/Brainiac');
const {
  ckbExp,
  ckbDouble,
  ckbUnsigned,
} = require('../Utils/BSC');

const brainiacRate = ckbUnsigned(1e18);

async function brainiacAccrued(comptroller, user) {
  return ckbUnsigned(await call(comptroller, 'brainiacAccrued', [user]));
}

async function brnBalance(comptroller, user) {
  return ckbUnsigned(await call(comptroller.brn, 'balanceOf', [user]))
}

async function totalBrainiacAccrued(comptroller, user) {
  return (await brainiacAccrued(comptroller, user)).add(await brnBalance(comptroller, user));
}

describe('Flywheel', () => {
  let root, a1, a2, a3, accounts;
  let comptroller, vLOW, vREP, vZRX, vEVIL;
  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller();
    vLOW = await makeBRToken({comptroller, supportMarket: true, underlyingPrice: 1, interestRateModelOpts});
    vREP = await makeBRToken({comptroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
    vZRX = await makeBRToken({comptroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    vEVIL = await makeBRToken({comptroller, supportMarket: false, underlyingPrice: 3, interestRateModelOpts});
  });

  describe('_grantBRN()', () => {
    beforeEach(async () => {
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});
    });

    it('should award brn if called by admin', async () => {
      const tx = await send(comptroller, '_grantBRN', [a1, 100]);
      expect(tx).toHaveLog('BrainiacGranted', {
        recipient: a1,
        amount: 100
      });
    });

    it('should revert if not called by admin', async () => {
      await expect(
        send(comptroller, '_grantBRN', [a1, 100], {from: a1})
      ).rejects.toRevert('revert only admin or impl can grant brn');
    });

    it('should revert if insufficient brn', async () => {
      await expect(
        send(comptroller, '_grantBRN', [a1, ckbUnsigned(1e20)])
      ).rejects.toRevert('revert insufficient brn for grant');
    });
  });

  describe('getBrainiacMarkets()', () => {
    it('should return the brainiac markets', async () => {
      for (let mkt of [vLOW, vREP, vZRX]) {
        await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      }
      expect(await call(comptroller, 'getBrainiacMarkets')).toEqual(
        [vLOW, vREP, vZRX].map((c) => c._address)
      );
    });
  });

  describe('_setBrainiacSpeed()', () => {
    it('should update market index when calling setBrainiacSpeed', async () => {
      const mkt = vREP;
      await send(comptroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [ckbUnsigned(10e18)]);

      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      await fastForward(comptroller, 20);
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(1)]);

      const {index, block} = await call(comptroller, 'brainiacSupplyState', [mkt._address]);
      expect(index).toEqualNumber(2e36);
      expect(block).toEqualNumber(20);
    });

    it('should correctly drop a brn market if called by admin', async () => {
      for (let mkt of [vLOW, vREP, vZRX]) {
        await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      }
      const tx = await send(comptroller, '_setBrainiacSpeed', [vLOW._address, 0]);
      expect(await call(comptroller, 'getBrainiacMarkets')).toEqual(
        [vREP, vZRX].map((c) => c._address)
      );
      expect(tx).toHaveLog('BrainiacSpeedUpdated', {
        brToken: vLOW._address,
        newSpeed: 0
      });
    });

    it('should correctly drop a brn market from middle of array', async () => {
      for (let mkt of [vLOW, vREP, vZRX]) {
        await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      }
      await send(comptroller, '_setBrainiacSpeed', [vREP._address, 0]);
      expect(await call(comptroller, 'getBrainiacMarkets')).toEqual(
        [vLOW, vZRX].map((c) => c._address)
      );
    });

    it('should not drop a brn market unless called by admin', async () => {
      for (let mkt of [vLOW, vREP, vZRX]) {
        await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      }
      await expect(
        send(comptroller, '_setBrainiacSpeed', [vLOW._address, 0], {from: a1})
      ).rejects.toRevert('revert only admin or impl can set brainiac speed');
    });

    it('should not add non-listed markets', async () => {
      const vBAT = await makeBRToken({ comptroller, supportMarket: false });
      await expect(
        send(comptroller, 'harnessAddBrainiacMarkets', [[vBAT._address]])
      ).rejects.toRevert('revert brainiac market is not listed');

      const markets = await call(comptroller, 'getBrainiacMarkets');
      expect(markets).toEqual([]);
    });
  });

  describe('updateBrainiacBorrowIndex()', () => {
    it('should calculate brn borrower index correctly', async () => {
      const mkt = vREP;
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      await send(comptroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalBorrows', [ckbUnsigned(11e18)]);
      await send(comptroller, 'harnessUpdateBrainiacBorrowIndex', [
        mkt._address,
        ckbExp(1.1),
      ]);
      /*
        100 blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed

        borrowAmt   = totalBorrows * 1e18 / borrowIdx
                    = 11e18 * 1e18 / 1.1e18 = 10e18
        brainiacAccrued = deltaBlocks * borrowSpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += 1e36 + brainiacAccrued * 1e36 / borrowAmt
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */

      const {index, block} = await call(comptroller, 'brainiacBorrowState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not revert or update brainiacBorrowState index if brToken not in Brainiac markets', async () => {
      const mkt = await makeBRToken({
        comptroller: comptroller,
        supportMarket: true,
        addBrainiacMarket: false,
      });
      await send(comptroller, 'setBlockNumber', [100]);
      await send(comptroller, 'harnessUpdateBrainiacBorrowIndex', [
        mkt._address,
        ckbExp(1.1),
      ]);

      const {index, block} = await call(comptroller, 'brainiacBorrowState', [mkt._address]);
      expect(index).toEqualNumber(0);
      expect(block).toEqualNumber(100);
      const speed = await call(comptroller, 'brainiacSpeeds', [mkt._address]);
      expect(speed).toEqualNumber(0);
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = vREP;
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      await send(comptroller, 'harnessUpdateBrainiacBorrowIndex', [
        mkt._address,
        ckbExp(1.1),
      ]);

      const {index, block} = await call(comptroller, 'brainiacBorrowState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(0);
    });

    it('should not update index if brainiac speed is 0', async () => {
      const mkt = vREP;
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      await send(comptroller, 'setBlockNumber', [100]);
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0)]);
      await send(comptroller, 'harnessUpdateBrainiacBorrowIndex', [
        mkt._address,
        ckbExp(1.1),
      ]);

      const {index, block} = await call(comptroller, 'brainiacBorrowState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(100);
    });
  });

  describe('updateBrainiacSupplyIndex()', () => {
    it('should calculate brn supplier index correctly', async () => {
      const mkt = vREP;
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      await send(comptroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalSupply', [ckbUnsigned(10e18)]);
      await send(comptroller, 'harnessUpdateBrainiacSupplyIndex', [mkt._address]);
      /*
        suppyTokens = 10e18
        brainiacAccrued = deltaBlocks * supplySpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += brainiacAccrued * 1e36 / supplyTokens
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */
      const {index, block} = await call(comptroller, 'brainiacSupplyState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not update index on non-Brainiac markets', async () => {
      const mkt = await makeBRToken({
        comptroller: comptroller,
        supportMarket: true,
        addBrainiacMarket: false
      });
      await send(comptroller, 'setBlockNumber', [100]);
      await send(comptroller, 'harnessUpdateBrainiacSupplyIndex', [
        mkt._address
      ]);

      const {index, block} = await call(comptroller, 'brainiacSupplyState', [mkt._address]);
      expect(index).toEqualNumber(0);
      expect(block).toEqualNumber(100);
      const speed = await call(comptroller, 'brainiacSpeeds', [mkt._address]);
      expect(speed).toEqualNumber(0);
      // brtoken could have no brainiac speed or brn supplier state if not in brainiac markets
      // this logic could also possibly be implemented in the allowed hook
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = vREP;
      await send(comptroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [ckbUnsigned(10e18)]);
      await send(comptroller, '_setBrainiacSpeed', [mkt._address, ckbExp(0.5)]);
      await send(comptroller, 'harnessUpdateBrainiacSupplyIndex', [mkt._address]);

      const {index, block} = await call(comptroller, 'brainiacSupplyState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(0);
    });

    it('should not matter if the index is updated multiple times', async () => {
      const brainiacRemaining = brainiacRate.mul(100)
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address]]);
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      await pretendBorrow(vLOW, a1, 1, 1, 100);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');

      await quickMint(vLOW, a2, ckbUnsigned(10e18));
      await quickMint(vLOW, a3, ckbUnsigned(15e18));

      const a2Accrued0 = await totalBrainiacAccrued(comptroller, a2);
      const a3Accrued0 = await totalBrainiacAccrued(comptroller, a3);
      const a2Balance0 = await balanceOf(vLOW, a2);
      const a3Balance0 = await balanceOf(vLOW, a3);

      await fastForward(comptroller, 20);

      const txT1 = await send(vLOW, 'transfer', [a2, a3Balance0.sub(a2Balance0)], {from: a3});

      const a2Accrued1 = await totalBrainiacAccrued(comptroller, a2);
      const a3Accrued1 = await totalBrainiacAccrued(comptroller, a3);
      const a2Balance1 = await balanceOf(vLOW, a2);
      const a3Balance1 = await balanceOf(vLOW, a3);

      await fastForward(comptroller, 10);
      await send(comptroller, 'harnessUpdateBrainiacSupplyIndex', [vLOW._address]);
      await fastForward(comptroller, 10);

      const txT2 = await send(vLOW, 'transfer', [a3, a2Balance1.sub(a3Balance1)], {from: a2});

      const a2Accrued2 = await totalBrainiacAccrued(comptroller, a2);
      const a3Accrued2 = await totalBrainiacAccrued(comptroller, a3);

      expect(a2Accrued0).toEqualNumber(0);
      expect(a3Accrued0).toEqualNumber(0);
      expect(a2Accrued1).not.toEqualNumber(0);
      expect(a3Accrued1).not.toEqualNumber(0);
      expect(a2Accrued1).toEqualNumber(a3Accrued2.sub(a3Accrued1));
      expect(a3Accrued1).toEqualNumber(a2Accrued2.sub(a2Accrued1));

      expect(txT1.gasUsed).toBeLessThan(220000);
      expect(txT1.gasUsed).toBeGreaterThan(150000);
      expect(txT2.gasUsed).toBeLessThan(150000);
      expect(txT2.gasUsed).toBeGreaterThan(100000);
    });
  });

  describe('distributeBorrowerBrainiac()', () => {

    it('should update borrow index checkpoint but not brainiacAccrued for first time user', async () => {
      const mkt = vREP;
      await send(comptroller, "setBrainiacBorrowState", [mkt._address, ckbDouble(6), 10]);
      await send(comptroller, "setBrainiacBorrowerIndex", [mkt._address, root, ckbUnsigned(0)]);

      await send(comptroller, "harnessDistributeBorrowerBrainiac", [mkt._address, root, ckbExp(1.1)]);
      expect(await call(comptroller, "brainiacAccrued", [root])).toEqualNumber(0);
      expect(await call(comptroller, "brainiacBorrowerIndex", [ mkt._address, root])).toEqualNumber(6e36);
    });

    it('should transfer brn and update borrow index checkpoint correctly for repeat time user', async () => {
      const mkt = vREP;
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, ckbUnsigned(5.5e18), ckbExp(1)]);
      await send(comptroller, "setBrainiacBorrowState", [mkt._address, ckbDouble(6), 10]);
      await send(comptroller, "setBrainiacBorrowerIndex", [mkt._address, a1, ckbDouble(1)]);

      /*
      * 100 delta blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed => 6e18 brainiacBorrowIndex
      * this tests that an acct with half the total borrows over that time gets 25e18 BRN
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e18 * 1e18 / 1.1e18 = 5e18
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 6e36 - 1e36 = 5e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e18 * 5e36 / 1e36 = 25e18
      */
      const tx = await send(comptroller, "harnessDistributeBorrowerBrainiac", [mkt._address, a1, ckbUnsigned(1.1e18)]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(25e18);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(0);
      expect(tx).toHaveLog('DistributedBorrowerBrainiac', {
        brToken: mkt._address,
        borrower: a1,
        brainiacDelta: ckbUnsigned(25e18).toFixed(),
        brainiacBorrowIndex: ckbDouble(6).toFixed()
      });
    });

    it('should not transfer brn automatically', async () => {
      const mkt = vREP;
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, ckbUnsigned(5.5e17), ckbExp(1)]);
      await send(comptroller, "setBrainiacBorrowState", [mkt._address, ckbDouble(1.0019), 10]);
      await send(comptroller, "setBrainiacBorrowerIndex", [mkt._address, a1, ckbDouble(1)]);
      /*
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e17 * 1e18 / 1.1e18 = 5e17
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 1.0019e36 - 1e36 = 0.0019e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
        0.00095e18 < brainiacClaimThreshold of 0.001e18
      */
      await send(comptroller, "harnessDistributeBorrowerBrainiac", [mkt._address, a1, ckbExp(1.1)]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0.00095e18);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-Brainiac market', async () => {
      const mkt = await makeBRToken({
        comptroller: comptroller,
        supportMarket: true,
        addBrainiacMarket: false,
      });

      await send(comptroller, "harnessDistributeBorrowerBrainiac", [mkt._address, a1, ckbExp(1.1)]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(0);
      expect(await call(comptroller, 'brainiacBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });
  });

  describe('distributeSupplierBrainiac()', () => {
    it('should transfer brn and update supply index correctly for first time user', async () => {
      const mkt = vREP;
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, ckbUnsigned(5e18)]);
      await send(comptroller, "setBrainiacSupplyState", [mkt._address, ckbDouble(6), 10]);
      /*
      * 100 delta blocks, 10e18 total supply, 0.5e18 supplySpeed => 6e18 brainiacSupplyIndex
      * confirming an acct with half the total supply over that time gets 25e18 BRN:
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 1e36 = 5e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 5e36 / 1e36 = 25e18
      */

      const tx = await send(comptroller, "harnessDistributeAllSupplierBrainiac", [mkt._address, a1]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(25e18);
      expect(tx).toHaveLog('DistributedSupplierBrainiac', {
        brToken: mkt._address,
        supplier: a1,
        brainiacDelta: ckbUnsigned(25e18).toFixed(),
        brainiacSupplyIndex: ckbDouble(6).toFixed()
      });
    });

    it('should update brn accrued and supply index for repeat user', async () => {
      const mkt = vREP;
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, ckbUnsigned(5e18)]);
      await send(comptroller, "setBrainiacSupplyState", [mkt._address, ckbDouble(6), 10]);
      await send(comptroller, "setBrainiacSupplierIndex", [mkt._address, a1, ckbDouble(2)])
      /*
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 2e36 = 4e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 4e36 / 1e36 = 20e18
      */

     await send(comptroller, "harnessDistributeAllSupplierBrainiac", [mkt._address, a1]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(20e18);
    });

    it('should not transfer when brainiacAccrued below threshold', async () => {
      const mkt = vREP;
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, ckbUnsigned(5e17)]);
      await send(comptroller, "setBrainiacSupplyState", [mkt._address, ckbDouble(1.0019), 10]);
      /*
        supplierAmount  = 5e17
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 1.0019e36 - 1e36 = 0.0019e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
      */

      await send(comptroller, "harnessDistributeSupplierBrainiac", [mkt._address, a1]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0.00095e18);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-Brainiac market', async () => {
      const mkt = await makeBRToken({
        comptroller: comptroller,
        supportMarket: true,
        addBrainiacMarket: false,
      });

      await send(comptroller, "harnessDistributeSupplierBrainiac", [mkt._address, a1]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(0);
      expect(await call(comptroller, 'brainiacBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });

  });

  describe('transferBRN', () => {
    it('should transfer brn accrued when amount is above threshold', async () => {
      const brainiacRemaining = 1000, a1AccruedPre = 100, threshold = 1;
      const brnBalancePre = await brnBalance(comptroller, a1);
      const tx0 = await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      const tx1 = await send(comptroller, 'setBrainiacAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(comptroller, 'harnessTransferBrainiac', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await brainiacAccrued(comptroller, a1);
      const brnBalancePost = await brnBalance(comptroller, a1);
      expect(brnBalancePre).toEqualNumber(0);
      expect(brnBalancePost).toEqualNumber(a1AccruedPre);
    });

    it('should not transfer when brn accrued is below threshold', async () => {
      const brainiacRemaining = 1000, a1AccruedPre = 100, threshold = 101;
      const brnBalancePre = await call(comptroller.brn, 'balanceOf', [a1]);
      const tx0 = await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      const tx1 = await send(comptroller, 'setBrainiacAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(comptroller, 'harnessTransferBrainiac', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await brainiacAccrued(comptroller, a1);
      const brnBalancePost = await brnBalance(comptroller, a1);
      expect(brnBalancePre).toEqualNumber(0);
      expect(brnBalancePost).toEqualNumber(0);
    });

    it('should not transfer brn if brn accrued is greater than brn remaining', async () => {
      const brainiacRemaining = 99, a1AccruedPre = 100, threshold = 1;
      const brnBalancePre = await brnBalance(comptroller, a1);
      const tx0 = await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      const tx1 = await send(comptroller, 'setBrainiacAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(comptroller, 'harnessTransferBrainiac', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await brainiacAccrued(comptroller, a1);
      const brnBalancePost = await brnBalance(comptroller, a1);
      expect(brnBalancePre).toEqualNumber(0);
      expect(brnBalancePost).toEqualNumber(0);
    });
  });

  describe('claimBrainiac', () => {
    it('should accrue brn and then transfer brn accrued', async () => {
      const brainiacRemaining = brainiacRate.mul(100), mintAmount = ckbUnsigned(12e18), deltaBlocks = 10;
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      await pretendBorrow(vLOW, a1, 1, 1, 100);
      await send(comptroller, '_setBrainiacSpeed', [vLOW._address, ckbExp(0.5)]);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');
      const speed = await call(comptroller, 'brainiacSpeeds', [vLOW._address]);
      const a2AccruedPre = await brainiacAccrued(comptroller, a2);
      const brnBalancePre = await brnBalance(comptroller, a2);
      await quickMint(vLOW, a2, mintAmount);
      await fastForward(comptroller, deltaBlocks);
      const tx = await send(comptroller, 'claimBrainiac', [a2]);
      const a2AccruedPost = await brainiacAccrued(comptroller, a2);
      const brnBalancePost = await brnBalance(comptroller, a2);
      expect(tx.gasUsed).toBeLessThan(400000);
      expect(speed).toEqualNumber(brainiacRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(brnBalancePre).toEqualNumber(0);
      expect(brnBalancePost).toEqualNumber(brainiacRate.mul(deltaBlocks).sub(1)); // index is 8333...
    });

    it('should accrue brn and then transfer brn accrued in a single market', async () => {
      const brainiacRemaining = brainiacRate.mul(100), mintAmount = ckbUnsigned(12e18), deltaBlocks = 10;
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      await pretendBorrow(vLOW, a1, 1, 1, 100);
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address]]);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');
      const speed = await call(comptroller, 'brainiacSpeeds', [vLOW._address]);
      const a2AccruedPre = await brainiacAccrued(comptroller, a2);
      const brnBalancePre = await brnBalance(comptroller, a2);
      await quickMint(vLOW, a2, mintAmount);
      await fastForward(comptroller, deltaBlocks);
      const tx = await send(comptroller, 'claimBrainiac', [a2, [vLOW._address]]);
      const a2AccruedPost = await brainiacAccrued(comptroller, a2);
      const brnBalancePost = await brnBalance(comptroller, a2);
      expect(tx.gasUsed).toBeLessThan(220000);
      expect(speed).toEqualNumber(brainiacRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(brnBalancePre).toEqualNumber(0);
      expect(brnBalancePost).toEqualNumber(brainiacRate.mul(deltaBlocks).sub(1)); // index is 8333...
    });

    it('should claim when brn accrued is below threshold', async () => {
      const brainiacRemaining = ckbExp(1), accruedAmt = ckbUnsigned(0.0009e18)
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      await send(comptroller, 'setBrainiacAccrued', [a1, accruedAmt]);
      await send(comptroller, 'claimBrainiac', [a1, [vLOW._address]]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(accruedAmt);
    });

    it('should revert when a market is not listed', async () => {
      const cNOT = await makeBRToken({comptroller});
      await expect(
        send(comptroller, 'claimBrainiac', [a1, [cNOT._address]])
      ).rejects.toRevert('revert not listed market');
    });
  });

  describe('claimBrainiac batch', () => {
    it('should revert when claiming brn from non-listed market', async () => {
      const brainiacRemaining = brainiacRate.mul(100), deltaBlocks = 10, mintAmount = ckbExp(10);
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;

      for(let from of claimAccts) {
        expect(await send(vLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(vLOW.underlying, 'approve', [vLOW._address, mintAmount], { from });
        send(vLOW, 'mint', [mintAmount], { from });
      }

      await pretendBorrow(vLOW, root, 1, 1, ckbExp(10));
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');

      await fastForward(comptroller, deltaBlocks);

      await expect(send(comptroller, 'claimBrainiac', [claimAccts, [vLOW._address, vEVIL._address], true, true])).rejects.toRevert('revert not listed market');
    });

    it('should claim the expected amount when holders and brtokens arg is duplicated', async () => {
      const brainiacRemaining = brainiacRate.mul(100), deltaBlocks = 10, mintAmount = ckbExp(10);
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(vLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(vLOW.underlying, 'approve', [vLOW._address, mintAmount], { from });
        send(vLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(vLOW, root, 1, 1, ckbExp(10));
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address]]);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');

      await fastForward(comptroller, deltaBlocks);

      const tx = await send(comptroller, 'claimBrainiac', [[...claimAccts, ...claimAccts], [vLOW._address, vLOW._address], false, true]);
      // brn distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(comptroller, 'brainiacSupplierIndex', [vLOW._address, acct])).toEqualNumber(ckbDouble(1.125));
        expect(await brnBalance(comptroller, acct)).toEqualNumber(ckbExp(1.25));
      }
    });

    it('claims brn for multiple suppliers only', async () => {
      const brainiacRemaining = brainiacRate.mul(100), deltaBlocks = 10, mintAmount = ckbExp(10);
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(vLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(vLOW.underlying, 'approve', [vLOW._address, mintAmount], { from });
        send(vLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(vLOW, root, 1, 1, ckbExp(10));
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address]]);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');

      await fastForward(comptroller, deltaBlocks);

      const tx = await send(comptroller, 'claimBrainiac', [claimAccts, [vLOW._address], false, true]);
      // brn distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(comptroller, 'brainiacSupplierIndex', [vLOW._address, acct])).toEqualNumber(ckbDouble(1.125));
        expect(await brnBalance(comptroller, acct)).toEqualNumber(ckbExp(1.25));
      }
    });

    it('claims brn for multiple borrowers only, primes uninitiated', async () => {
      const brainiacRemaining = brainiacRate.mul(100), deltaBlocks = 10, mintAmount = ckbExp(10), borrowAmt = ckbExp(1), borrowIdx = ckbExp(1)
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      let [_,__, ...claimAccts] = saddle.accounts;

      for(let acct of claimAccts) {
        await send(vLOW, 'harnessIncrementTotalBorrows', [borrowAmt]);
        await send(vLOW, 'harnessSetAccountBorrows', [acct, borrowAmt, borrowIdx]);
      }
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address]]);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');

      await send(comptroller, 'harnessFastForward', [10]);

      const tx = await send(comptroller, 'claimBrainiac', [claimAccts, [vLOW._address], true, false]);
      for(let acct of claimAccts) {
        expect(await call(comptroller, 'brainiacBorrowerIndex', [vLOW._address, acct])).toEqualNumber(ckbDouble(2.25));
        expect(await call(comptroller, 'brainiacSupplierIndex', [vLOW._address, acct])).toEqualNumber(0);
      }
    });

    it('should revert when a market is not listed', async () => {
      const cNOT = await makeBRToken({comptroller});
      await expect(
        send(comptroller, 'claimBrainiac', [[a1, a2], [cNOT._address], true, true])
      ).rejects.toRevert('revert not listed market');
    });
  });

  describe('harnessRefreshBrainiacSpeeds', () => {
    it('should start out 0', async () => {
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');
      const speed = await call(comptroller, 'brainiacSpeeds', [vLOW._address]);
      expect(speed).toEqualNumber(0);
    });

    it('should get correct speeds with borrows', async () => {
      await pretendBorrow(vLOW, a1, 1, 1, 100);
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address]]);
      const tx = await send(comptroller, 'harnessRefreshBrainiacSpeeds');
      const speed = await call(comptroller, 'brainiacSpeeds', [vLOW._address]);
      expect(speed).toEqualNumber(brainiacRate);
      expect(tx).toHaveLog(['BrainiacSpeedUpdated', 0], {
        brToken: vLOW._address,
        newSpeed: speed
      });
    });

    it('should get correct speeds for 2 assets', async () => {
      await pretendBorrow(vLOW, a1, 1, 1, 100);
      await pretendBorrow(vZRX, a1, 1, 1, 100);
      await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address, vZRX._address]]);
      await send(comptroller, 'harnessRefreshBrainiacSpeeds');
      const speed1 = await call(comptroller, 'brainiacSpeeds', [vLOW._address]);
      const speed2 = await call(comptroller, 'brainiacSpeeds', [vREP._address]);
      const speed3 = await call(comptroller, 'brainiacSpeeds', [vZRX._address]);
      expect(speed1).toEqualNumber(brainiacRate.div(4));
      expect(speed2).toEqualNumber(0);
      expect(speed3).toEqualNumber(brainiacRate.div(4).mul(3));
    });
  });

  describe('harnessAddBrainiacMarkets', () => {
    it('should correctly add a brainiac market if called by admin', async () => {
      const vBAT = await makeBRToken({comptroller, supportMarket: true});
      const tx1 = await send(comptroller, 'harnessAddBrainiacMarkets', [[vLOW._address, vREP._address, vZRX._address]]);
      const tx2 = await send(comptroller, 'harnessAddBrainiacMarkets', [[vBAT._address]]);
      const markets = await call(comptroller, 'getBrainiacMarkets');
      expect(markets).toEqual([vLOW, vREP, vZRX, vBAT].map((c) => c._address));
      expect(tx2).toHaveLog('BrainiacSpeedUpdated', {
        brToken: vBAT._address,
        newSpeed: 1
      });
    });

    it('should not write over a markets existing state', async () => {
      const mkt = vLOW._address;
      const bn0 = 10, bn1 = 20;
      const idx = ckbUnsigned(1.5e36);

      await send(comptroller, "harnessAddBrainiacMarkets", [[mkt]]);
      await send(comptroller, "setBrainiacSupplyState", [mkt, idx, bn0]);
      await send(comptroller, "setBrainiacBorrowState", [mkt, idx, bn0]);
      await send(comptroller, "setBlockNumber", [bn1]);
      await send(comptroller, "_setBrainiacSpeed", [mkt, 0]);
      await send(comptroller, "harnessAddBrainiacMarkets", [[mkt]]);

      const supplyState = await call(comptroller, 'brainiacSupplyState', [mkt]);
      expect(supplyState.block).toEqual(bn1.toFixed());
      expect(supplyState.index).toEqual(idx.toFixed());

      const borrowState = await call(comptroller, 'brainiacBorrowState', [mkt]);
      expect(borrowState.block).toEqual(bn1.toFixed());
      expect(borrowState.index).toEqual(idx.toFixed());
    });
  });

  describe('claimBrainiac bankrupt accounts', () => {
    let brToken, liquidity, shortfall, comptroller;
    const borrowed = 6666666;
    const minted = 1e6;
    const collateralFactor = 0.5, underlyingPrice = 1, amount = 1e6;
    beforeEach(async () => {
      // prepare a brToken
      comptroller = await makeComptroller();
      brToken = await makeBRToken({comptroller, supportMarket: true, collateralFactor, underlyingPrice});

      // enter market and make user borrow something
      await enterMarkets([brToken], a1);
      // mint brToken to get user some liquidity
      await quickMint(brToken, a1, minted);
      ({1: liquidity, 2: shortfall} = await call(
        brToken.comptroller, 
        'getAccountLiquidity', 
        [a1]));
      expect(liquidity).toEqualNumber(minted * collateralFactor);
      expect(shortfall).toEqualNumber(0);

      // borror some tokens and let user go bankrupt
      await pretendBorrow(brToken, a1, 1, 1, borrowed);
      ({1: liquidity, 2: shortfall} = await call(
        brToken.comptroller, 
        'getAccountLiquidity', 
        [a1]));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber((borrowed - minted) * collateralFactor);
    });

    it('should stop bankrupt accounts from claiming', async () => {
      // claiming brainiac will fail
      const brainiacRemaining = ckbUnsigned(100e18);
      const accruedAmt = ckbUnsigned(10e18);
      await send(comptroller.brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      await send(comptroller, 'setBrainiacAccrued', [a1, accruedAmt]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(accruedAmt);
      expect(await brnBalance(comptroller, a1)).toEqualNumber(0);

      await expect(
        send(comptroller, 'claimBrainiac', [a1, [brToken._address]])
      ).rejects.toRevert('revert bankrupt accounts can only collateralize their pending brn rewards');
    });

    it('should use the pending brn reward of bankrupt accounts as collateral and liquidator can liquidate them', async () => {
      // set brn and brBRN token
      const brn = await makeToken();
      const brBRN = await makeBRToken({comptroller, supportMarket: true, collateralFactor: 0.5, underlying: brn, root, underlyingPrice: 1});
      const brainiacRemaining = ckbUnsigned(100e18);

      // this small amount of accrued brn couldn't save the user out of bankrupt...
      const smallAccruedAmt = ckbUnsigned(888);
      // ...but this can
      const bigAccruedAmt = ckbUnsigned(10e18);

      await enterMarkets([brBRN], a1);
      await send(comptroller, 'setBRNAddress', [brn._address]);
      await send(comptroller, 'setBRNBRTokenAddress', [brBRN._address]);
      await send(brn, 'transfer', [comptroller._address, brainiacRemaining], {from: root});
      await send(comptroller, 'setBrainiacAccrued', [a1, smallAccruedAmt]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(smallAccruedAmt);

      // mintBehalf is called
      await send(comptroller, 'claimBrainiacAsCollateral', [a1]);

      // balance check
      expect(ckbUnsigned(await call(brn, 'balanceOf', [a1]))).toEqualNumber(0);
      expect(ckbUnsigned(await call(brBRN, 'balanceOf', [a1]))).toEqualNumber(smallAccruedAmt);
      expect(ckbUnsigned(await call(brn, 'balanceOf', [comptroller._address]))).toEqualNumber(brainiacRemaining.sub(smallAccruedAmt));
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(0);

      // liquidity check, a part of user's debt is paid off but the user's
      // still bankrupt 
      ({1: liquidity, 2: shortfall} = await call(
        comptroller, 
        'getAccountLiquidity', 
        [a1]));
      expect(liquidity).toEqualNumber(0);
      const shortfallBefore = ckbUnsigned(borrowed - minted); 
      const shortfallAfter = shortfallBefore.sub(smallAccruedAmt) * collateralFactor;
      expect(shortfall).toEqualNumber(shortfallAfter)

      // give the user big amount of reward so the user can pay off the debt
      await send(comptroller, 'setBrainiacAccrued', [a1, bigAccruedAmt]);
      expect(await brainiacAccrued(comptroller, a1)).toEqualNumber(bigAccruedAmt);

      await send(comptroller, 'claimBrainiacAsCollateral', [a1]);
      ({1: liquidity, 2: shortfall} = await call(
        comptroller, 
        'getAccountLiquidity', 
        [a1]));
      expect(liquidity).toEqualNumber(ckbUnsigned(bigAccruedAmt * collateralFactor).sub(shortfallAfter));
      expect(shortfall).toEqualNumber(0)

      // balance check
      expect(ckbUnsigned(await call(brn, 'balanceOf', [a1]))).toEqualNumber(0);
      expect(ckbUnsigned(await call(brBRN, 'balanceOf', [a1]))).toEqualNumber(smallAccruedAmt.add(bigAccruedAmt));
      expect(ckbUnsigned(await call(brn, 'balanceOf', [comptroller._address]))).toEqualNumber(brainiacRemaining.sub(smallAccruedAmt).sub(bigAccruedAmt));
    });

  })
});
