import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { WalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./theme/ThemeProvider";
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";
import "./styles.css";

const PII_PROGRAM_ID = "pii_protocol_v1.aleo";

function Root() {
  const wallets = useMemo(
    () => [new LeoWalletAdapter({ appName: "Aleo PII Manager" })],
    [],
  );

  return (
    <WalletProvider
      wallets={wallets}
      network={WalletAdapterNetwork.TestnetBeta}
      decryptPermission={DecryptPermission.UponRequest}
      programs={[PII_PROGRAM_ID]}
      autoConnect={false}
    >
      <WalletModalProvider>
        <I18nProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </I18nProvider>
      </WalletModalProvider>
    </WalletProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
