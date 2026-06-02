export { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
export {
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
export type { WalletError } from "@demox-labs/aleo-wallet-adapter-base";

import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

export interface AleoTransitionInput {
  program: string;
  functionName: string;
  inputs: string[];
}

export interface AleoTransaction {
  address: string;
  chainId: string;
  transitions: AleoTransitionInput[];
  fee: number;
  feePrivate: boolean;
}

export type UseWalletReturn = ReturnType<typeof useWallet>;
