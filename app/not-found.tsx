import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty not-found">
      <ThemeToggle />
      <img
        src="/images/logo-original.png"
        alt="Boucherie du Faubourg"
        width={100}
      />
      <div className="eyebrow">404 · CE RAYON N’EXISTE PAS</div>
      <h1>Revenons au comptoir.</h1>
      <p>Cette page ou ce produit n’est plus disponible.</p>
      <Link className="button primary" href="/boutique">
        Découvrir la boutique →
      </Link>
    </div>
  );
}
