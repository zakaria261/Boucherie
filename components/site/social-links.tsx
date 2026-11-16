import type { SocialLinks as Links } from "@/lib/types";

const networks: { key: keyof Links; label: string; path: string }[] = [
  {
    key: "instagram",
    label: "Instagram",
    path: "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.9-7.8a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1 1.1-.1 1.4-.1 4.1-.1ZM12 2c-2.7 0-3.1 0-4.1.1C4.2 2.3 2.3 4.2 2.1 7.9 2 8.9 2 9.3 2 12s0 3.1.1 4.1c.2 3.7 2.1 5.6 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.7-.2 5.6-2.1 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.2-3.7-2.1-5.6-5.8-5.8C15.1 2 14.7 2 12 2Z",
  },
  {
    key: "facebook",
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z",
  },
  {
    key: "tiktok",
    label: "TikTok",
    path: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6Z",
  },
];

/** Liens vers les réseaux renseignés par la boucherie ; rien si aucun. */
export function SocialLinks({ links, labelled = false }: { links: Links; labelled?: boolean }) {
  const present = networks.filter((n) => links[n.key]);
  if (!present.length) return null;
  return (
    <ul className={`social-links ${labelled ? "labelled" : ""}`} aria-label="Réseaux sociaux">
      {present.map((n) => (
        <li key={n.key}>
          <a href={links[n.key]} target="_blank" rel="noreferrer me" aria-label={labelled ? undefined : n.label}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d={n.path} fill="currentColor" />
            </svg>
            {labelled && <span>{n.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
