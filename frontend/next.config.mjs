/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // RainbowKit's default connector bundle pulls in Coinbase's Smart
    // Wallet SDK (@coinbase/cdp-sdk) via the unused "Base Account"
    // connector. That SDK's x402 payment feature has several internal
    // imports (e.g. '@x402/evm/upto/client', '@x402/evm/exact/client')
    // that don't resolve - there may be more than one. This app never
    // uses the Coinbase/Base Account connector at all (only OKX Wallet,
    // MetaMask, injected, and WalletConnect are configured in wagmi.ts),
    // so instead of patching each broken subpath one at a time, stub out
    // the whole @coinbase/cdp-sdk package - webpack then never even
    // looks inside its files for their own broken imports.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/cdp-sdk": false,
    };
    return config;
  },
};

export default nextConfig;
