const {
  address,
  encodeParameters,
} = require('../Utils/BSC');
const {
  makeComptroller,
  makeBRToken,
} = require('../Utils/Brainiac');

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

describe('BrainiacLens', () => {
  let BrainiacLens;
  let acct;

  beforeEach(async () => {
    BrainiacLens = await deploy('BrainiacLens');
    acct = accounts[0];
  });

  describe('brTokenMetadata', () => {
    it('is correct for a brErc20', async () => {
      let brErc20 = await makeBRToken();
      expect(
        cullTuple(await call(BrainiacLens, 'brTokenMetadata', [brErc20._address]))
      ).toEqual(
        {
          brToken: brErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(brErc20, 'underlying', []),
          brTokenDecimals: "8",
          underlyingDecimals: "18",
          brainiacSupplySpeed: "0",
          brainiacBorrowSpeed: "0",
          dailySupplyBrn: "0",
          dailyBorrowBrn: "0"
        }
      );
    });

    it('is correct for brCkb', async () => {
      let brCkb = await makeBRToken({kind: 'brckb'});
      expect(
        cullTuple(await call(BrainiacLens, 'brTokenMetadata', [brCkb._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        brToken: brCkb._address,
        brTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
        brainiacSupplySpeed: "0",
        brainiacBorrowSpeed: "0",
        dailySupplyBrn: "0",
        dailyBorrowBrn: "0"
      });
    });
  });

  describe('brTokenMetadataAll', () => {
    it('is correct for a brErc20 and brCkb', async () => {
      let brErc20 = await makeBRToken();
      let brCkb = await makeBRToken({kind: 'brckb'});
      expect(
        (await call(BrainiacLens, 'brTokenMetadataAll', [[brErc20._address, brCkb._address]])).map(cullTuple)
      ).toEqual([
        {
          brToken: brErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(brErc20, 'underlying', []),
          brTokenDecimals: "8",
          underlyingDecimals: "18",
          brainiacSupplySpeed: "0",
          brainiacBorrowSpeed: "0",
          dailySupplyBrn: "0",
          dailyBorrowBrn: "0",
        },
        {
          borrowRatePerBlock: "0",
          brToken: brCkb._address,
          brTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
          brainiacSupplySpeed: "0",
          brainiacBorrowSpeed: "0",
          dailySupplyBrn: "0",
          dailyBorrowBrn: "0",
        }
      ]);
    });
  });

  describe('brTokenBalances', () => {
    it('is correct for vERC20', async () => {
      let brErc20 = await makeBRToken();
      expect(
        cullTuple(await call(BrainiacLens, 'brTokenBalances', [brErc20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          brToken: brErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for brCKB', async () => {
      let brCkb = await makeBRToken({kind: 'brckb'});
      let ckbBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(BrainiacLens, 'brTokenBalances', [brCkb._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          brToken: brCkb._address,
          tokenAllowance: ckbBalance,
          tokenBalance: ckbBalance,
        }
      );
    });
  });

  describe('brTokenBalancesAll', () => {
    it('is correct for brCkb and brErc20', async () => {
      let brErc20 = await makeBRToken();
      let brCkb = await makeBRToken({kind: 'brckb'});
      let ckbBalance = await web3.eth.getBalance(acct);
      
      expect(
        (await call(BrainiacLens, 'brTokenBalancesAll', [[brErc20._address, brCkb._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          brToken: brErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          brToken: brCkb._address,
          tokenAllowance: ckbBalance,
          tokenBalance: ckbBalance,
        }
      ]);
    })
  });

  describe('brTokenUnderlyingPrice', () => {
    it('gets correct price for brErc20', async () => {
      let brErc20 = await makeBRToken();
      expect(
        cullTuple(await call(BrainiacLens, 'brTokenUnderlyingPrice', [brErc20._address]))
      ).toEqual(
        {
          brToken: brErc20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for brCkb', async () => {
      let brCkb = await makeBRToken({kind: 'brckb'});
      expect(
        cullTuple(await call(BrainiacLens, 'brTokenUnderlyingPrice', [brCkb._address]))
      ).toEqual(
        {
          brToken: brCkb._address,
          underlyingPrice: "1000000000000000000",
        }
      );
    });
  });

  describe('brTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let brErc20 = await makeBRToken();
      let brCkb = await makeBRToken({kind: 'brckb'});
      expect(
        (await call(BrainiacLens, 'brTokenUnderlyingPriceAll', [[brErc20._address, brCkb._address]])).map(cullTuple)
      ).toEqual([
        {
          brToken: brErc20._address,
          underlyingPrice: "0",
        },
        {
          brToken: brCkb._address,
          underlyingPrice: "1000000000000000000",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let comptroller = await makeComptroller();

      expect(
        cullTuple(await call(BrainiacLens, 'getAccountLimits', [comptroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let brn, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;
    let votingDelay;
    let votingPeriod;

    beforeEach(async () => {
      brn = await deploy('BRN', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), brn._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(brn, 'delegate', [acct]);
      await send(gov, 'propose', [targets, values, signatures, callDatas, "do nothing"]);
      proposalBlock = +(await web3.eth.getBlockNumber());
      proposalId = await call(gov, 'latestProposalIds', [acct]);
      votingDelay = Number(await call(gov, 'votingDelay'));
      votingPeriod = Number(await call(gov, 'votingPeriod'));
    });

    describe('getGovReceipts', () => {
      it('gets correct values', async () => {
        expect(
          (await call(BrainiacLens, 'getGovReceipts', [gov._address, acct, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            hasVoted: false,
            proposalId: proposalId,
            support: false,
            votes: "0",
          }
        ]);
      })
    });

    describe('getGovProposals', () => {
      it('gets correct values', async () => {
        expect(
          (await call(BrainiacLens, 'getGovProposals', [gov._address, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            againstVotes: "0",
            calldatas: callDatas,
            canceled: false,
            endBlock: (Number(proposalBlock) + votingDelay + votingPeriod).toString(),
            eta: "0",
            executed: false,
            forVotes: "0",
            proposalId: proposalId,
            proposer: acct,
            signatures: signatures,
            startBlock: (Number(proposalBlock) + votingDelay).toString(),
            targets: targets
          }
        ]);
      })
    });
  });

  describe('brn', () => {
    let brn, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      brn = await deploy('BRN', [acct]);
    });

    describe('getBRNBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(BrainiacLens, 'getBRNBalanceMetadata', [brn._address, acct]))
        ).toEqual({
          balance: "30000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getBRNBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let comptroller = await makeComptroller();
        await send(comptroller, 'setBrainiacAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(BrainiacLens, 'getBRNBalanceMetadataExt', [brn._address, comptroller._address, acct]))
        ).toEqual({
          balance: "30000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
          allocated: "5"
        });
      });
    });

    describe('getBrainiacVotes', () => {
      it('gets correct values', async () => {
        expect(
          (await call(BrainiacLens, 'getBrainiacVotes', [brn._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
        ).toEqual([
          {
            blockNumber: currentBlock.toString(),
            votes: "0",
          },
          {
            blockNumber: (Number(currentBlock) - 1).toString(),
            votes: "0",
          }
        ]);
      });

      it('reverts on future value', async () => {
        await expect(
          call(BrainiacLens, 'getBrainiacVotes', [brn._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert BRN::getPriorVotes: not yet determined')
      });
    });
  });

  describe('dailyBRN', () => {
    it('can get dailyBRN for an account', async () => {
      let brErc20 = await makeBRToken();
      let comptrollerAddress = await brErc20.comptroller._address;
      expect(
        await call(BrainiacLens, 'getDailyBRN', [acct, comptrollerAddress])
      ).toEqual("0");
    });
  });

});
