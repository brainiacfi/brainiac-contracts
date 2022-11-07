const { address, ckbMantissa } = require('../Utils/BSC');

const { makeComptroller, makeBRToken, makePriceOracle } = require('../Utils/Brainiac');

describe('Comptroller', function() {
  let root, accounts;
  let unitroller;
  let brains;
  let oracle;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    oracle = await makePriceOracle();
    brains = await deploy('Comptroller');
    unitroller = await deploy('Unitroller');
  });

  let initializeBrains = async (priceOracle, closeFactor) => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address]);
    const unitrollerAsBrain = await saddle.getContractAt('Comptroller', unitroller._address);
    await send(unitrollerAsBrain, '_setPriceOracle', [priceOracle._address]);
    await send(unitrollerAsBrain, '_setCloseFactor', [closeFactor]);
    await send(unitrollerAsBrain, '_setLiquidationIncentive', [ckbMantissa(1)]);
    return unitrollerAsBrain;
  };

  describe('delegating to comptroller', () => {
    const closeFactor = ckbMantissa(0.051);
    let unitrollerAsComptroller, brToken;

    beforeEach(async () => {
      unitrollerAsComptroller = await initializeBrains(oracle, ckbMantissa(0.06));
      brToken = await makeBRToken({ comptroller: unitrollerAsComptroller });
    });

    describe('becoming brains sets initial state', () => {
      it('reverts if this is not the pending implementation', async () => {
        await expect(
          send(brains, '_become', [unitroller._address])
        ).rejects.toRevert('revert not authorized');
      });

      it('on success it sets admin to caller of constructor', async () => {
        expect(await call(unitrollerAsComptroller, 'admin')).toEqual(root);
        expect(await call(unitrollerAsComptroller, 'pendingAdmin')).toBeAddressZero();
      });

      it('on success it sets closeFactor as specified', async () => {
        const comptroller = await initializeBrains(oracle, closeFactor);
        expect(await call(comptroller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
      });
    });

    describe('_setCollateralFactor', () => {
      const half = ckbMantissa(0.5),
        one = ckbMantissa(1);

      it('fails if not called by admin', async () => {
        expect(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [brToken._address, half], {
            from: accounts[1]
          })
        ).toHaveTrollFailure('UNAUTHORIZED', 'SET_COLLATERAL_FACTOR_OWNER_CHECK');
      });

      it('fails if asset is not listed', async () => {
        expect(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [brToken._address, half])
        ).toHaveTrollFailure('MARKET_NOT_LISTED', 'SET_COLLATERAL_FACTOR_NO_EXISTS');
      });

      it('fails if factor is too high', async () => {
        const brToken = await makeBRToken({ supportMarket: true, comptroller: unitrollerAsComptroller });
        expect(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [brToken._address, one])
        ).toHaveTrollFailure('INVALID_COLLATERAL_FACTOR', 'SET_COLLATERAL_FACTOR_VALIDATION');
      });

      it('fails if factor is set without an underlying price', async () => {
        const brToken = await makeBRToken({ supportMarket: true, comptroller: unitrollerAsComptroller });
        expect(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [brToken._address, half])
        ).toHaveTrollFailure('PRICE_ERROR', 'SET_COLLATERAL_FACTOR_WITHOUT_PRICE');
      });

      it('succeeds and sets market', async () => {
        const brToken = await makeBRToken({ supportMarket: true, comptroller: unitrollerAsComptroller });
        await send(oracle, 'setUnderlyingPrice', [brToken._address, 1]);
        expect(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [brToken._address, half])
        ).toHaveLog('NewCollateralFactor', {
          brToken: brToken._address,
          oldCollateralFactorMantissa: '0',
          newCollateralFactorMantissa: half.toString()
        });
      });
    });

    describe('_supportMarket', () => {
      it('fails if not called by admin', async () => {
        expect(
          await send(unitrollerAsComptroller, '_supportMarket', [brToken._address], { from: accounts[1] })
        ).toHaveTrollFailure('UNAUTHORIZED', 'SUPPORT_MARKET_OWNER_CHECK');
      });

      it('fails if asset is not a BRToken', async () => {
        const notABRToken = await makePriceOracle();
        await expect(send(unitrollerAsComptroller, '_supportMarket', [notABRToken._address])).rejects.toRevert();
      });

      it('succeeds and sets market', async () => {
        const result = await send(unitrollerAsComptroller, '_supportMarket', [brToken._address]);
        expect(result).toHaveLog('MarketListed', { brToken: brToken._address });
      });

      it('cannot list a market a second time', async () => {
        const result1 = await send(unitrollerAsComptroller, '_supportMarket', [brToken._address]);
        const result2 = await send(unitrollerAsComptroller, '_supportMarket', [brToken._address]);
        expect(result1).toHaveLog('MarketListed', { brToken: brToken._address });
        expect(result2).toHaveTrollFailure('MARKET_ALREADY_LISTED', 'SUPPORT_MARKET_EXISTS');
      });

      it('can list two different markets', async () => {
        const brToken1 = await makeBRToken({ comptroller: unitroller });
        const brToken2 = await makeBRToken({ comptroller: unitroller });
        const result1 = await send(unitrollerAsComptroller, '_supportMarket', [brToken1._address]);
        const result2 = await send(unitrollerAsComptroller, '_supportMarket', [brToken2._address]);
        expect(result1).toHaveLog('MarketListed', { brToken: brToken1._address });
        expect(result2).toHaveLog('MarketListed', { brToken: brToken2._address });
      });
    });
  });
});
