import { GitHub, Linkedin } from "react-feather";
import siteConfig from "@/data/siteConfig";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  github: <GitHub size={18} aria-hidden="true" />,
  linkedin: <Linkedin size={18} aria-hidden="true" />,
};

export const Footer: React.FC = () => (
  <footer className="site-footer">
    <p>Konrad Staniszewski <span aria-hidden="true">·</span> 2026</p>
    {siteConfig.social ? (
      <ul className="flex items-center gap-2" aria-label="Social links">
        {Object.entries(siteConfig.social).map(([key, href]) => (
          <li key={key}>
            <a href={href} className="social-link" aria-label={key === "github" ? "GitHub" : "LinkedIn"}>
              {SOCIAL_ICONS[key]}
            </a>
          </li>
        ))}
      </ul>
    ) : null}
  </footer>
);
