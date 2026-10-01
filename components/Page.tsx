import Head from "next/head";
import { onlyText } from "react-children-utilities";
import siteConfig from "@/data/siteConfig";
import { Prose } from "@/components/Prose";
import { cx } from "@/lib/utils";
import { formatPostDate } from "@/lib/date";

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
      {!isInteractive ? (
        <header className={cx("page-heading", isEditorial && "article-heading")}>
          {date ? (
            <time className="page-date" dateTime={formatPostDate(date).iso}>{formatPostDate(date).label}</time>
          ) : null}
          <h1>{title}</h1>
          {description ? (
            <div className="page-description">
              {typeof description === "string" ? <p>{description}</p> : <Prose>{description}</Prose>}
            </div>
          ) : null}
        </header>
      ) : null}
      {children}
    </>
  );
};
