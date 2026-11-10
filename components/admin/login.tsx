"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "./api";

export function AdminLogin({ setup, configured }: { setup: boolean; configured: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(true);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${setup ? "setup" : "login"}`, "POST", { ...data, remember });
      const next = params.get("suite") || "";
      router.replace(/^\/admin(\/[\w\-/%]*)?$/.test(next) ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img className="login-icon" src="/app-icons/icon-192.png" alt="" width={84} height={84} />
        <h1>Faubourg Pro</h1>
        <p className="login-sub">
          {setup
            ? "Créez l’accès du propriétaire de la boucherie."
            : "Commandes, produits et publications de la Boucherie du Faubourg."}
        </p>
        {setup && !configured ? (
          <p className="inline-error">
            L’accès propriétaire doit d’abord être initialisé sur le serveur
            (variable ADMIN_SETUP_TOKEN). Consultez le guide d’installation.
          </p>
        ) : (
          <>
            <div className="group-body">
              {setup && (
                <label className="field">
                  <span>Code de première installation</span>
                  <input name="token" required autoComplete="off" type="password" />
                </label>
              )}
              <label className="field">
                <span>Votre e-mail</span>
                <input
                  name="email"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder="vous@exemple.fr"
                  maxLength={150}
                />
              </label>
              <label className="field">
                <span>Mot de passe</span>
                <span className="password-input">
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
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
                {setup && <small>Au moins 12 caractères.</small>}
              </label>
              <label className="row toggle-row">
                <span className="row-text">
                  <span className="row-label">Rester connecté</span>
                  <span className="row-detail">30 jours sur cet appareil</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className="switch"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
              </label>
            </div>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn filled large" disabled={busy}>
              {busy ? "Connexion…" : setup ? "Créer mon espace" : "Entrer dans ma boutique"}
            </button>
          </>
        )}
        <p className="login-foot">Espace privé, réservé au propriétaire.</p>
      </form>
    </div>
  );
}
