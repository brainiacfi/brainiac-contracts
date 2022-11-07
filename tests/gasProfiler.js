const {
  ckbUnsigned,
  ckbMantissa,
  ckbExp,
} = require('./Utils/BSC');

const {
  makeComptroller,
  makeBRToken,
  preApprove,
  preSupply,
  quickRedeem,
} = require('./Utils/Brainiac');

async function brnBalance(comptroller, user) {
  return ckbUnsigned(await call(comptroller.brn, 'balanceOf', [user]))
}

async function brainiacAccrued(comptroller, user) {
  return ckbUnsigned(await call(comptroller, 'brainiacAccrued', [user]));
}

async function fastForwardPatch(patch, comptroller, blocks) {
  if (patch == 'unitroller') {
    return await send(comptroller, 'harnessFastForward', [blocks]);
  } else {
    return await send(comptroller, 'fastForward', [blocks]);
  }
}

const fs = require('fs');
const util = require('util');
const diffStringsUnified = require('jest-diff').default;


async function preRedeem(
  brToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(brToken, redeemer, redeemTokens);
  await send(brToken.underlying, 'harnessSetBalance', [
    brToken._address,
    redeemAmount
  ]);
}

const sortOpcodes = (opcodesMap) => {
  return Object.values(opcodesMap)
    .map(elem => [elem.fee, elem.name])
    .sort((a, b) => b[0] - a[0]);
};

const getGasCostFile = name => {
  try {
    const jsonString = fs.readFileSync(name);
    return JSON.parse(jsonString);
  } catch (err) {
    console.log(err);
    return {};
  }
};

const recordGasCost = (totalFee, key, filename, opcodes = {}) => {
  let fileObj = getGasCostFile(filename);
  const newCost = {fee: totalFee, opcodes: opcodes};
  console.log(diffStringsUnified(fileObj[key], newCost));
  fileObj[key] = newCost;
  fs.writeFileSync(filename, JSON.stringify(fileObj, null, ' '), 'utf-8');
};

async function mint(brToken, minter, mintAmount, exchangeRate) {
  expect(await preApprove(brToken, minter, mintAmount, {})).toSucceed();
  return send(brToken, 'mint', [mintAmount], { from: minter });
}

async function claimBrainiac(comptroller, holder) {
  return send(comptroller, 'claimBrainiac', [holder], { from: holder });
}

/// GAS PROFILER: saves a digest of the gas prices of common BRToken operations
/// transiently fails, not sure why

describe('Gas report', () => {
  let root, minter, redeemer, accounts, brToken;
  const exchangeRate = 50e3;
  const preMintAmount = ckbUnsigned(30e4);
  const mintAmount = ckbUnsigned(10e4);
  const mintTokens = mintAmount.div(exchangeRate);
  const redeemTokens = ckbUnsigned(10e3);
  const redeemAmount = redeemTokens.multipliedBy(exchangeRate);
  const filename = './gasCosts.json';

  describe('BRToken', () => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      brToken = await makeBRToken({
        comptrollerOpts: { kind: 'bool'}, 
        interestRateModelOpts: { kind: 'white-paper'},
        exchangeRate
      });
    });

    it('first mint', async () => {
      await send(brToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(brToken, 'harnessSetBlockNumber', [41]);

      const trxReceipt = await mint(brToken, minter, mintAmount, exchangeRate);
      recordGasCost(trxReceipt.gasUsed, 'first mint', filename);
    });

    it('second mint', async () => {
      await mint(brToken, minter, mintAmount, exchangeRate);

      await send(brToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(brToken, 'harnessSetBlockNumber', [41]);

      const mint2Receipt = await mint(brToken, minter, mintAmount, exchangeRate);
      expect(Object.keys(mint2Receipt.events)).toEqual(['AccrueInterest', 'Transfer', 'Mint']);

      console.log(mint2Receipt.gasUsed);
      const opcodeCount = {};

      await saddle.trace(mint2Receipt, {
        execLog: log => {
          if (log.lastLog != undefined) {
            const key = `${log.op} @ ${log.gasCost}`;
            opcodeCount[key] = (opcodeCount[key] || 0) + 1;
          }
        }
      });

      recordGasCost(mint2Receipt.gasUsed, 'second mint', filename, opcodeCount);
    });

    it('second mint, no interest accrued', async () => {
      await mint(brToken, minter, mintAmount, exchangeRate);

      await send(brToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(brToken, 'harnessSetBlockNumber', [40]);

      const mint2Receipt = await mint(brToken, minter, mintAmount, exchangeRate);
      expect(Object.keys(mint2Receipt.events)).toEqual(['Transfer', 'Mint']);
      recordGasCost(mint2Receipt.gasUsed, 'second mint, no interest accrued', filename);

      // console.log("NO ACCRUED");
      // const opcodeCount = {};
      // await saddle.trace(mint2Receipt, {
      //   execLog: log => {
      //     opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
      //   }
      // });
      // console.log(getOpcodeDigest(opcodeCount));
    });

    it('redeem', async () => {
      await preRedeem(brToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      const trxReceipt = await quickRedeem(brToken, redeemer, redeemTokens);
      recordGasCost(trxReceipt.gasUsed, 'redeem', filename);
    });

    it.skip('print mint opcode list', async () => {
      await preMint(brToken, minter, mintAmount, mintTokens, exchangeRate);
      const trxReceipt = await quickMint(brToken, minter, mintAmount);
      const opcodeCount = {};
      await saddle.trace(trxReceipt, {
        execLog: log => {
          opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
        }
      });
      console.log(getOpcodeDigest(opcodeCount));
    });
  });

  describe.each([
    ['unitroller-g2'],
    ['unitroller']
  ])('BRN claims %s', (patch) => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      comptroller = await makeComptroller({ kind: patch });
      let interestRateModelOpts = {borrowRate: 0.000001};
      brToken = await makeBRToken({comptroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
      if (patch == 'unitroller') {
        await send(comptroller, '_setBrainiacSpeed', [brToken._address, ckbExp(0.05)]);
      } else {
        await send(comptroller, '_addBrainiacMarkets', [[brToken].map(c => c._address)]);
        await send(comptroller, 'setBrainiacSpeed', [brToken._address, ckbExp(0.05)]);
      }
      await send(comptroller.brn, 'transfer', [comptroller._address, ckbUnsigned(50e18)], {from: root});
    });

    it(`${patch} second mint with brn accrued`, async () => {
      await mint(brToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, comptroller, 10);

      console.log('BRN balance before mint', (await brnBalance(comptroller, minter)).toString());
      console.log('BRN accrued before mint', (await brainiacAccrued(comptroller, minter)).toString());
      const mint2Receipt = await mint(brToken, minter, mintAmount, exchangeRate);
      console.log('BRN balance after mint', (await brnBalance(comptroller, minter)).toString());
      console.log('BRN accrued after mint', (await brainiacAccrued(comptroller, minter)).toString());
      recordGasCost(mint2Receipt.gasUsed, `${patch} second mint with brn accrued`, filename);
    });

    it(`${patch} claim brn`, async () => {
      await mint(brToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, comptroller, 10);

      console.log('BRN balance before claim', (await brnBalance(comptroller, minter)).toString());
      console.log('BRN accrued before claim', (await brainiacAccrued(comptroller, minter)).toString());
      const claimReceipt = await claimBrainiac(comptroller, minter);
      console.log('BRN balance after claim', (await brnBalance(comptroller, minter)).toString());
      console.log('BRN accrued after claim', (await brainiacAccrued(comptroller, minter)).toString());
      recordGasCost(claimReceipt.gasUsed, `${patch} claim brn`, filename);
    });
  });
});
