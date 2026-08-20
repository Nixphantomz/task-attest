import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  okxWallet,
  metaMaskWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { xLayerTestnet, xLayerMainnet } from "./chains";

// A public WalletConnect project id is only needed for the WalletConnect
// connector (mobile QR). Get one free at https://cloud.walletconnect.com.
// If unset, injected/OKX/MetaMask browser-extension connectors still work.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "task-attest-demo";

export const wagmiConfig = getDefaultConfig({
  appName: "TaskAttest",
  projectId,
  // OKX Wallet first — this is an OKX / X Layer hackathon.
  wallets: [
    {
      groupName: "Recommended",
      wallets: [okxWallet, metaMaskWallet, injectedWallet, walletConnectWallet],
    },
  ],
  chains: [xLayerTestnet, xLayerMainnet],
  ssr: true,
});
