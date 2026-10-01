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
  const fullWidth = Component.fullWidth;
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
      <div className="site-layout">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <div className="site-container"><Header /></div>
        <main id="main-content" className={fullWidth ? "site-main site-main-wide" : "site-main site-container"}>
          <Component {...pageProps} />
        </main>
        <div className="site-container"><Footer /></div>
      </div>
    </ThemeProvider>
  );
}

export default MyApp;
