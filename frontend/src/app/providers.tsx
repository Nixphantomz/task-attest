"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useEffect, useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wagmi";

// Matches the monochrome tokens in globals.css - no hue accent, just
// inverted fill (white-on-dark / dark-on-light), same as the CTA buttons.
const rainbowDarkTheme = darkTheme({
  accentColor: "#f5f5f3",
  accentColorForeground: "#0a0a0b",
  borderRadius: "medium",
});

const rainbowLightTheme = lightTheme({
  accentColor: "#131315",
  accentColorForeground: "#f7f7f5",
  borderRadius: "medium",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const read = () => {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "light" ? "light" : "dark");
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme === "light" ? rainbowLightTheme : rainbowDarkTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}