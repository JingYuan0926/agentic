import '@coinbase/onchainkit/styles.css';
import "@/styles/globals.css";
import Web3ModalProvider from "../context/Web3Modal";
import { Providers } from '../components/providers';

function App({ Component, pageProps }) {
  return (
    <Web3ModalProvider>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Web3ModalProvider>
  );
}

export default App;
