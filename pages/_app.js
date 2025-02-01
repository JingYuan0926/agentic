import "@/styles/globals.css";
import { HeroUIProvider } from "@heroui/react";

function App({ Component, pageProps }) {
  return (
    <HeroUIProvider>
      <Component {...pageProps} />
    </HeroUIProvider>
  );
}

export default App;
