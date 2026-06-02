import type { FC } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { WalletModalProvider, WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
// Import wallet adapter CSS
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import Home from './Home';

const wallets = [
  new ShieldWalletAdapter(),
];

export const App: FC = () => {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={true}
      onError={error => console.error(error)}
    >
      <WalletModalProvider>
        <div className='flex flex-col'>
          <div className='flex justify-end p-3'>
            <WalletMultiButton />
          </div>
          <div className='flex justify-center items-center'>
            <Home />
          </div>
        </div>
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};