import type { GetStaticProps, GetStaticPaths, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { getAllMdx } from "@/lib/mdx";
import { slugify } from "@/lib/utils";
import { MDXFrontMatter } from "@/lib/types";
import { Page } from "@/components/Page";
import { PostList } from "@/components/PostList";

interface ContextProps extends ParsedUrlQuery {
  tag: string;
}

interface PostsProps {
  tag: string;
  posts: Array<MDXFrontMatter>;
}

const Posts: NextPage<PostsProps> = ({ tag, posts }) => {
  return (
    <div className="blog-index">
      <Page title={`Posts tagged: "${tag}"`}>
        <PostList posts={posts} />
      </Page>
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const mdxFiles = getAllMdx().map((post) => post["frontMatter"]);
  const tagSet = new Set<string>();
  for (const file of mdxFiles) {
    if (file.tags) {
      for (const tag of file.tags) {
        tagSet.add(tag);
      }
    }
  }
  const pathArray = [];
  for (const tag of tagSet) {
    pathArray.push(
      {
        params: {
          tag: slugify(tag)
        }
      }
    );

  }
  const params = {
    paths: pathArray,
    fallback: false
  };
  return params;
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { tag } = context.params as ContextProps;
  const mdxFiles = getAllMdx().map((post) => post["frontMatter"]);
  return {
    props: {
      tag,
      posts: mdxFiles.filter((file) => {
        return file.tags?.some((value) => slugify(value) === tag);
      }),
    },
  };
};

export default Posts;
