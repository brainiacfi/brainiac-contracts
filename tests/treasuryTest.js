const {
  ckbMantissa,
  ckbUnsigned,
} = require('./Utils/BSC');

const BigNumber = require('bignumber.js');

const {
  makeToken
} = require('./Utils/Brainiac');

const transferAmount = ckbMantissa(1000);
const ckbAmount = new BigNumber(1e17);
const withdrawCKBAmount = new BigNumber(3e15);

async function makeTreasury(opts = {}) {
  const {
    root = saddle.account,
    kind = 'vTreasury'
  } = opts || {};

  if (kind == 'vTreasury') {
    return await deploy('BRTreasury', []);
  }
}

async function withdrawTreasuryERC20(vTreasury, tokenAddress, withdrawAmount, withdrawAddress, caller) {
  return send(vTreasury, 'withdrawTreasuryERC20', 
    [
      tokenAddress,
      withdrawAmount,
      withdrawAddress,      
    ], { from: caller });
}

async function withdrawTreasuryCKB(vTreasury, withdrawAmount, withdrawAddress, caller) {
  return send(vTreasury, 'withdrawTreasuryCKB', 
    [
      withdrawAmount,
      withdrawAddress,      
    ], { from: caller });
}

describe('BRTreasury', function () {
  let root, minter, redeemer, accounts;
  let vTreasury
  let erc20Token;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    // Create New Erc20 Token
    erc20Token = await makeToken();
    // Create New vTreasury
    vTreasury = await makeTreasury();
    // Transfer ERC20 to vTreasury Contract for test
    await send(erc20Token, 'transfer', [vTreasury._address, transferAmount]);
    // Transfer CKB to vTreasury Contract for test
    await web3.eth.sendTransaction({ from: root, to: vTreasury._address, value: ckbAmount.toFixed()});
  });

  it ('Check CKB Balnce', async() => {
    expect(await web3.eth.getBalance(vTreasury._address)).toEqual(ckbAmount.toFixed());
  });

  it ('Check Owner', async() => {
    const treasuryOwner = await call(vTreasury, 'owner', []);
    expect(treasuryOwner).toEqual(root);
  });

  it ('Check Change Owner', async() => {
    await send(vTreasury, 'transferOwnership', [accounts[0]], { from: root });
    const newTreasuryOwner = await call(vTreasury, 'owner', []);
    expect(newTreasuryOwner).toEqual(accounts[0]);
  })


  it ('Check Wrong Owner', async() => {
    // Call withdrawTreausry with wrong owner
    await expect(withdrawTreasuryERC20(vTreasury, erc20Token._address, transferAmount, accounts[0], accounts[1]))
      .rejects
      .toRevert("revert Ownable: caller is not the owner");
  });

  it ('Check Withdraw Treasury ERC20 Token, Over Balance of Treasury', async() => {
    const overWithdrawAmount = ckbMantissa(1001);
    // Check Before ERC20 Balance
    expect(ckbUnsigned(await call(erc20Token, 'balanceOf', [vTreasury._address]))).toEqual(transferAmount);

    // Call withdrawTreasury ERC20
    await withdrawTreasuryERC20(
      vTreasury,
      erc20Token._address,
      overWithdrawAmount,
      accounts[0],
      root
    );

    // Check After Balance
    expect(await call(erc20Token, 'balanceOf', [vTreasury._address])).toEqual('0');
    // Check withdrawAddress Balance
    expect(ckbUnsigned(await call(erc20Token, 'balanceOf', [accounts[0]]))).toEqual(transferAmount);
  });

  it ('Check Withdraw Treasury ERC20 Token, less Balance of Treasury', async() => {
    const withdrawAmount = ckbMantissa(1);
    const leftAmouont = ckbMantissa(999);
    // Check Before ERC20 Balance
    expect(ckbUnsigned(await call(erc20Token, 'balanceOf', [vTreasury._address]))).toEqual(transferAmount);

    // Call withdrawTreasury ERC20
    await withdrawTreasuryERC20(
      vTreasury,
      erc20Token._address,
      withdrawAmount,
      accounts[0],
      root
    );

    // Check After Balance
    expect(ckbUnsigned(await call(erc20Token, 'balanceOf', [vTreasury._address]))).toEqual(leftAmouont);
    // Check withdrawAddress Balance
    expect(ckbUnsigned(await call(erc20Token, 'balanceOf', [accounts[0]]))).toEqual(withdrawAmount);
  });

  it ('Check Withdraw Treasury CKB, Over Balance of Treasury', async() => {
    const overWithdrawAmount = ckbAmount.plus(1).toFixed();
    // Get Original Balance of Withdraw Account
    const originalBalance = await web3.eth.getBalance(accounts[0]);
    // Get Expected New Balance of Withdraw Account
    const newBalance = ckbAmount.plus(originalBalance);

    // Call withdrawTreasury CKB
    await withdrawTreasuryCKB(
      vTreasury,
      overWithdrawAmount,
      accounts[0],
      root
    );

    // Check After Balance
    expect(await web3.eth.getBalance(vTreasury._address)).toEqual('0');
    // Check withdrawAddress Balance
    expect(await web3.eth.getBalance(accounts[0])).toEqual(newBalance.toFixed());
  });

  it ('Check Withdraw Treasury CKB, less Balance of Treasury', async() => {
    const withdrawAmount = withdrawCKBAmount.toFixed();
    const leftAmount = ckbAmount.minus(withdrawCKBAmount);
    // Get Original Balance of Withdraw Account
    const originalBalance = await web3.eth.getBalance(accounts[0]);
    // Get Expected New Balance of Withdraw Account
    const newBalance = withdrawCKBAmount.plus(originalBalance);

    // Call withdrawTreasury CKB
    await withdrawTreasuryCKB(
      vTreasury,
      withdrawAmount,
      accounts[0],
      root
    );

    // Check After Balance
    expect(await web3.eth.getBalance(vTreasury._address)).toEqual(leftAmount.toFixed());
    // Check withdrawAddress Balance
    expect(await web3.eth.getBalance(accounts[0])).toEqual(newBalance.toFixed());
  });
});
