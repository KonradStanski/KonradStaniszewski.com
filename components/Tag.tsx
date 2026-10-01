import Link from "next/link";
import { slugify } from "@/lib/utils";

interface TagProps {
  href: string;
  children: string;
}

export const Tag: React.FC<TagProps> = ({ href, children }) => (
  <Link href={href} className="post-tag">#{slugify(children)}</Link>
);
