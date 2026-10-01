import "katex/dist/katex.min.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type LayoutAwarePage = NextPage & {
  fullWidth?: boolean;
  immersive?: boolean;
};

type LayoutAwareAppProps = AppProps & {
  Component: LayoutAwarePage;
};

function MyApp({ Component, pageProps }: LayoutAwareAppProps) {
  const fullWidth = (Component as any).fullWidth;
  const immersive = Component.immersive;

  if (immersive) {
    return (
      <ThemeProvider
        disableTransitionOnChange
        defaultTheme="system"
        attribute="class"
      >
        <Component {...pageProps} />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider
      disableTransitionOnChange
      defaultTheme="system"
      attribute="class"
    >
      <div className="flex flex-col max-w-5xl mx-auto px-4">
        <Header />
      </div>
      <div className={fullWidth ? "px-4" : "max-w-5xl mx-auto px-4"}>
        <Component {...pageProps} />
      </div>
      <div className="flex flex-col max-w-5xl mx-auto px-4">
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default MyApp;
