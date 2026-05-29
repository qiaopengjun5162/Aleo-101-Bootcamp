/* eslint-disable react/prop-types */
import { useMemo } from "react";
import { Network } from "@provablehq/aleo-types";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import {
  WalletModalProvider,
} from "@provablehq/aleo-wallet-adaptor-react-ui";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";

// 导入钱包 UI 默认样式
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

export default function AleoWalletProviderWrapper({ children }) {
  const programs = useMemo(
    () => ["yao990x16_age_verifier.aleo", "credits.aleo"],
    []
  );

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
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      programs={programs}
      autoConnect={false}
      onError={(error) => console.error("Aleo wallet error:", error)}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}
