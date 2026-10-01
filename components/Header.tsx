import { useRouter } from "next/router";
import siteConfig from "@/data/siteConfig";
import Link from "next/link";
import { ThemeSelect } from "@/components/ThemeSelect";

export const Header: React.FC = () => {
  const { pathname } = useRouter();
  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <ul className="flex flex-wrap items-center gap-x-5 sm:gap-x-8">
          {siteConfig.nav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={isActive ? "page" : undefined} className="site-nav-link">
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <ThemeSelect />
    </header>
  );
};
