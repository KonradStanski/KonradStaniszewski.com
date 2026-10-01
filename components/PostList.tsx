import Link from "next/link";
import type { MDXFrontMatter } from "@/lib/types";
import { formatPostDate } from "@/lib/date";
import { slugify } from "@/lib/utils";
import { Tag } from "./Tag";

interface PostListProps {
  posts: Array<MDXFrontMatter>;
}

export const PostList: React.FC<PostListProps> = ({ posts }) => (
  <ul className="post-list">
    {posts.map((post) => {
      const date = formatPostDate(post.date);
      return (
        <li key={post.slug}>
          <article className="post-preview">
            <time dateTime={date.iso} className="post-preview-date">{date.label}</time>
            <div className="min-w-0">
              <h2 className="post-preview-title">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.description ? <p className="post-preview-description">{post.description}</p> : null}
              {post.tags?.length ? (
                <ul className="post-tags" aria-label="Topics">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Tag href={`/blog/tagged/${slugify(tag)}`}>{tag}</Tag>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        </li>
      );
    })}
  </ul>
);
