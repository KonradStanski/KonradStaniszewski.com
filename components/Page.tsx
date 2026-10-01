import Head from "next/head";
import { onlyText } from "react-children-utilities";
import siteConfig from "@/data/siteConfig";
import { Prose } from "@/components/Prose";
import { cx } from "@/lib/utils";

interface PageProps {
  date?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  thumbnail?: string;
  children?: React.ReactNode;
  layout?: "editorial" | "interactive";
}

export const Page: React.FC<PageProps> = ({
  date,
  title,
  description,
  thumbnail,
  children,
  layout,
}) => {
  const metaTitle = onlyText(title);
  const metaDescription = description
    ? onlyText(description)
    : siteConfig.siteDescription;
  const metaThumbnail = thumbnail ? thumbnail : siteConfig.siteThumbnail;
  const customTitle = `${metaTitle} - ${siteConfig.siteName}`;
  const isEditorial = layout === "editorial";
  const isInteractive = layout === "interactive";
  return (
    <>
      <Head>
        <title>{customTitle}</title>
        <meta name="og:url" content={siteConfig.siteUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <meta name="og:description" content={metaDescription} />
        <meta
          property="og:image"
          content={`${siteConfig.siteUrl}${metaThumbnail}`}
        />
      </Head>
      {!isInteractive ? <div
        className={cx(
          isEditorial ? "mb-12 pt-4 sm:mb-16 sm:pt-8" : "mb-4 border-b",
          !isEditorial && "border-gray-200 dark:border-gray-700"
        )}
      >
        <h1 className={cx(
          "font-bold",
          isEditorial
            ? "max-w-4xl font-serif text-4xl leading-[1.04] tracking-[-0.035em] sm:text-6xl"
            : "text-3xl"
        )}>{title}</h1>
        {date && !isEditorial ? (
          <time
            className={cx("block mb-2", "text-gray-500", "dark:text-gray-400")}
          >
            {date}
          </time>
        ) : null}
        {description ? (
          <div className={cx("mt-4 mb-2", isEditorial && "max-w-3xl text-lg sm:text-xl")}>
            <Prose>
              {typeof description === "string" ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </Prose>
          </div>
        ) : null}
        {date && isEditorial ? (
          <time className="mt-5 block text-sm text-gray-500 dark:text-gray-400">
            {date}
          </time>
        ) : null}
      </div> : null}
      {children}
    </>
  );
};
