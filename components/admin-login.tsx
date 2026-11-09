"use client";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { api } from "./admin-shell";
export function AdminLogin({
  setup,
  configured,
  logo,
}: {
  setup: boolean;
  configured: boolean;
  logo: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${setup ? "setup" : "login"}`, "POST", data);
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <div className="login-art">
        <Link href="/">← Retour à la boutique</Link>
        <div>
          <img src={logo} alt="Logo de la Boucherie du Faubourg" />
          <div className="eyebrow">VOTRE SAVOIR-FAIRE, VOTRE BOUTIQUE</div>
          <h1>
            Le comptoir
            <br />
            <em>est à vous.</em>
          </h1>
          <p>
            Des produits aux commandes, prenez soin de votre boutique en
            quelques gestes.
          </p>
        </div>
        <span>BOUCHERIE DU FAUBOURG · AMIENS</span>
      </div>
      <div className="login-form-wrap">
        <ThemeToggle />
        <form className="admin-form login-form" onSubmit={submit}>
          <span className="login-lock">
            <LockKeyhole size={22} />
          </span>
          <div className="eyebrow">ESPACE PROPRIÉTAIRE</div>
          <h2>{setup ? "Bienvenue chez vous." : "Heureux de vous revoir."}</h2>
          <p>
            {setup
              ? "Créez votre accès personnel pour gérer la boutique."
              : "Connectez-vous pour retrouver votre boutique."}
          </p>
          {setup && !configured ? (
            <div className="form-error">
              L’accès propriétaire doit être initialisé sur le serveur.
              Consultez le guide d’installation.
            </div>
          ) : (
            <>
              {setup && (
                <label>
                  Code de première installation
                  <input
                    name="token"
                    required
                    autoComplete="off"
                    type="password"
                  />
                  <small>
                    Le code se trouve dans le fichier privé ACCES-ADMIN.txt du
                    projet.
                  </small>
                </label>
              )}
              <label>
                Votre e-mail
                <input
                  name="email"
                  required
                  type="email"
                  autoComplete="username"
                  placeholder="vous@exemple.fr"
                  maxLength={150}
                />
              </label>
              <label>
                Mot de passe
                <div className="password-input">
                  <input
                    name="password"
                    required
                    minLength={setup ? 12 : 1}
                    maxLength={200}
                    type={show ? "text" : "password"}
                    autoComplete={setup ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    aria-label={
                      show
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {setup && <small>Choisissez au moins 12 caractères.</small>}
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary full" disabled={busy}>
                {busy
                  ? "Connexion…"
                  : setup
                    ? "Créer mon espace"
                    : "Entrer dans ma boutique"}
                <ArrowRight size={17} />
              </button>
            </>
          )}
          <p className="login-help">
            Un espace privé, réservé au propriétaire de la boucherie.
          </p>
        </form>
      </div>
    </div>
  );
}
