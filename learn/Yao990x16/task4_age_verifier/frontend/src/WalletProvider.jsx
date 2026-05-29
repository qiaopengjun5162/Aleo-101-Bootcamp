import React, { useMemo } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import {
  WalletModalProvider,
} from "@provablehq/aleo-wallet-adaptor-react-ui";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";

// 导入钱包 UI 默认样式
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

export default function AleoWalletProviderWrapper({ children }) {
  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter({ appName: "ZK Age Verifier" }),
      new LeoWalletAdapter({ appName: "ZK Age Verifier" }),
    ],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      autoConnect={false}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}
