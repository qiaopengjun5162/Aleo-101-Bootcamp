"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { PuzzleWalletAdapter } from "@provablehq/aleo-wallet-adaptor-puzzle";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { FoxWalletAdapter } from "@provablehq/aleo-wallet-adaptor-fox";
import { Network } from "@provablehq/aleo-types";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { PROGRAM_ID } from "@/lib/constants";

// Shield (Provable's official wallet) is primary; Puzzle / Leo / Fox are
// registered as siblings so the demo still connects with whatever extension a
// tester actually has. Adapters are instantiated only after mount because their
// constructors touch browser globals (window.shield etc.), which would crash SSR.
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wallets = useMemo(
    () =>
      mounted
        ? [
            new ShieldWalletAdapter(),
            new PuzzleWalletAdapter(),
            new LeoWalletAdapter(),
            new FoxWalletAdapter(),
          ]
        : [],
    [mounted],
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      autoConnect
      decryptPermission={DecryptPermission.UponRequest}
      programs={[PROGRAM_ID]}
      onError={(e) => console.error("[wallet]", e)}
    >
      {children}
    </AleoWalletProvider>
  );
}
