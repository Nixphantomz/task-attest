import { defineChain } from "viem";

// X Layer Testnet — "Terigon", chain ID 1952 (the current testnet; NOT the
// deprecated 195 that some chainlists still show). Values confirmed from
// X Layer's own developer docs.
export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech/terigon"] },
  },
  blockExplorers: {
    default: {
      name: "OKX X Layer Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer-test",
    },
  },
  testnet: true,
});

// X Layer Mainnet — chain ID 196 (for the post-hackathon launch).
export const xLayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: {
      name: "OKX X Layer Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer",
    },
  },
});

// Circle-issued native USDC (confirmed via Circle docs).
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  1952: "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3", // testnet
  196: "0xB6CEceAB302E2E4948951eE7843FC24E92933061", // mainnet
};

// USDC uses 6 decimals on both networks.
export const USDC_DECIMALS = 6;
