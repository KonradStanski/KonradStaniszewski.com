import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import Link from "next/link";
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import rehypePrism from "rehype-prism-plus";
import { getAllMdx } from "@/lib/mdx";
import { MDXFrontMatter } from "@/lib/types";
import { Page } from "@/components/Page";
import { components } from "@/components/MDX";
import { Prose } from "@/components/Prose";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

interface ContextProps extends ParsedUrlQuery {
  slug: string;
}

interface PostProps {
  frontMatter: MDXFrontMatter;
  mdx: any;
  previous: MDXFrontMatter | null;
  next: MDXFrontMatter | null;
}

const Post: NextPage<PostProps> = ({ frontMatter, mdx, previous, next }) => {
  return (
    <article className="blog-post">
      <Page {...frontMatter} layout={frontMatter.layout ?? "editorial"}>
        <Prose article={frontMatter.layout !== "interactive"}>
          <MDXRemote {...mdx} components={components} />
        </Prose>
        {previous || next ? (
          <nav className="post-navigation" aria-label="Adjacent posts">
            {previous ? (
              <Link href={`/blog/${previous.slug}`} className="post-navigation-link">
                <span className="post-navigation-label">Previous post</span>
                <span>{previous.title}</span>
              </Link>
            ) : null}
            {next ? (
              <Link href={`/blog/${next.slug}`} className="post-navigation-link post-navigation-next">
                <span className="post-navigation-label">Next post</span>
                <span>{next.title}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </Page>
    </article>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const mdxFiles = getAllMdx();
  return {
    paths: mdxFiles.map((file) => ({
      params: { slug: file.frontMatter.slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { slug } = context.params as ContextProps;
  const mdxFiles = getAllMdx();
  const postIndex = mdxFiles.findIndex((p) => p.frontMatter.slug === slug);
  const post = mdxFiles[postIndex];
  const { frontMatter, content } = post;
  const mdxContent = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: false }]] as any,
      rehypePlugins: [
        rehypeKatex,
        rehypePrism,
        rehypeSlug,
        [rehypeAutolinkHeadings, {
          behavior: 'wrap',
          properties: {
            className: ["heading-link"],
          },
        }]
      ] as any,
    },
    scope: frontMatter,
  });
  return {
    props: {
      frontMatter,
      mdx: mdxContent,
      previous: mdxFiles[postIndex + 1]?.frontMatter || null,
      next: mdxFiles[postIndex - 1]?.frontMatter || null,
    },
  };
};

export default Post;
