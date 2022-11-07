import { addresses } from "./address";
const isGodwokenTestnet = false;

export const getAssetAddresses = () => {
  if (isGodwokenTestnet) {
    return {
      bandOracle: addresses.godwokenTestnet.bandOracle,
      DEAD : addresses.dead,
      ZERO : addresses.zero,
      ETH : addresses.godwokenTestnet.ETH,
      USDC : addresses.godwokenTestnet.USDC,
      DAI : addresses.godwokenTestnet.DAI,
      USDT : addresses.godwokenTestnet.USDT,
      BUSD : addresses.godwokenTestnet.BUSD,
      CKB :addresses.godwokenTestnet.CKB,
      BNB :addresses.godwokenTestnet.BNB
    };
  }else{
    return {
      bandOracle: addresses.godwoken.bandOracle,
      DEAD : addresses.dead,
      ZERO : addresses.zero,
      ETH : addresses.godwoken.ETH,
      USDC : addresses.godwoken.USDC,
      DAI : addresses.godwoken.DAI,
      USDT : addresses.godwoken.USDT,
      BUSD : addresses.godwoken.BUSD,
      CKB :addresses.godwoken.CKB,
      BNB :addresses.godwoken.BNB
    };

  }
};
