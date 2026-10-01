import { cx } from "@/lib/utils";

export const Prose: React.FC<{
  children: React.ReactNode;
  article?: boolean;
}> = ({ children, article = false }) => (
  <div className={cx("prose site-prose max-w-none dark:prose-invert", article && "article-prose")}>
    {children}
  </div>
);
