import { Html, Head, Main, NextScript } from "next/document";
import Document, { DocumentContext } from "next/document";
import { cx } from "@/lib/utils";

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps;
  }

  render() {
    return (
      <Html lang="en">
        <Head />
        <body
          className={cx(
            "bg-gray-50 text-gray-800",
            "dark:bg-gray-900 dark:text-gray-50",
            // Offset dot grids for the light and dark backgrounds.
            "bg-[length:50px_50px] bg-[position:0_0,25px_25px]",
            "bg-[radial-gradient(#e5e7eb_1px,transparent_1px),radial-gradient(#e5e7eb_1px,transparent_1px)]",
            "dark:bg-[radial-gradient(#3e4654_1px,transparent_1px),radial-gradient(#3e4654_1px,transparent_1px)]",
          )}
        >
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
