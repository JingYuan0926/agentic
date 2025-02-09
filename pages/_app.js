import "@/styles/globals.css";
import { Web3Modal } from '../context/Web3Modal'


function App({ Component, pageProps }) {
  return (
    <Web3Modal>
      <div className="min-h-screen bg-gradient-to-br from-[#9DF1F2] via-[#F9E9FB] to-[#E0CCFF] overflow-hidden">
        <Component {...pageProps} />
      </div>
    </Web3Modal>
  );
}

export default App;
