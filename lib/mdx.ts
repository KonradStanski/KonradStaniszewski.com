import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { MDXFrontMatter } from "@/lib/types";

const root = process.cwd();

export const postsPath = path.join(root, "blog");

export const getMdx = (fileName: string) => {
  const fullPath = path.join(postsPath, fileName);
  const docSource = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(docSource);
  const dateValue = String(data.date);
  const localDate = data.date instanceof Date
    ? new Date(
        data.date.getUTCFullYear(),
        data.date.getUTCMonth(),
        data.date.getUTCDate(),
        12
      )
    : /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
      ? new Date(`${dateValue}T12:00:00`)
      : new Date(dateValue);
  data.date = localDate.toDateString();
  return {
    frontMatter: {
      ...data,
    } as MDXFrontMatter,
    content,
  };
};

export const getAllMdx = () => {
  const items = fs.readdirSync(postsPath).map((item) => getMdx(item));
  return items.sort(
    (a, b) =>
      new Date(b.frontMatter.date).getTime() -
      new Date(a.frontMatter.date).getTime()
  );
};
