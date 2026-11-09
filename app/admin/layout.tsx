import "./admin.css";
import "./mobile-fixes.css";
export const metadata = {
  title: {
    default: "Espace propriétaire | Boucherie du Faubourg",
    template: "%s | Administration",
  },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
