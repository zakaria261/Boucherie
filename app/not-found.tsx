import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <img src="/images/logo-original.png" alt="Boucherie du Faubourg" width={96} height={96} />
      <h1>Cette page n’existe pas.</h1>
      <p>Le produit a peut-être été retiré, ou le lien est incomplet.</p>
      <Link href="/boutique">Voir la boutique</Link>
      <style>{`
        .not-found{min-height:100vh;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;font-family:system-ui,-apple-system,sans-serif;background:#f7f3ec;color:#1f1d1a}
        .not-found h1{font-size:1.6rem}
        .not-found a{color:#7a1f2b;font-weight:600}
        @media (prefers-color-scheme: dark){.not-found{background:#191817;color:#f3eee6}.not-found a{color:#e08a96}}
      `}</style>
    </div>
  );
}
