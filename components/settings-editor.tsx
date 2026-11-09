"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LockKeyhole, Save } from "lucide-react";
import type { Settings } from "@/lib/types";
import { ImageField } from "./image-field";
import { api } from "./admin-shell";
export function SettingsEditor({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial),
    [busy, setBusy] = useState(false),
    [uploads, setUploads] = useState(0),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [passwordMessage, setPasswordMessage] = useState(""),
    [passwordBusy, setPasswordBusy] = useState(false);
  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await api("/api/admin/settings", "PUT", settings);
      setSettings(result.settings);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const imageBusy = (state: boolean) =>
    setUploads((n) => Math.max(0, n + (state ? 1 : -1)));
  async function password(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPasswordBusy(true);
    setPasswordMessage("");
    try {
      await api(
        "/api/auth/password",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      setPasswordMessage(
        "Mot de passe mis à jour. Les autres sessions ont été déconnectées.",
      );
      form.reset();
    } catch (e) {
      setPasswordMessage((e as Error).message);
    } finally {
      setPasswordBusy(false);
    }
  }
  return (
    <>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-page-heading">
          <div>
            <div className="eyebrow">UNE VITRINE À VOTRE IMAGE</div>
            <h1>Ma boutique.</h1>
            <p>
              Votre identité, votre histoire, vos informations. Tout simplement.
            </p>
          </div>
          <button className="button primary" disabled={busy || uploads > 0}>
            <Save size={17} />
            {busy ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="save-success" role="status">
            <Check size={18} /> Les informations de votre boutique ont été
            enregistrées.
          </div>
        )}
        <div className="settings-grid">
          <div>
            <section className="admin-panel form-panel">
              <h2>L’identité de la maison</h2>
              <p>Le premier regard sur votre savoir-faire.</p>
              <label>
                Nom de la boutique
                <input
                  required
                  maxLength={100}
                  value={settings.name}
                  onChange={(e) => field("name", e.target.value)}
                />
              </label>
              <ImageField
                label="Logo de la boutique"
                value={settings.logo}
                onChange={(v) => field("logo", v)}
                onBusy={imageBusy}
              />
            </section>
            <section className="admin-panel form-panel">
              <h2>La page d’accueil</h2>
              <label>
                Message du bandeau supérieur
                <input
                  required
                  maxLength={150}
                  value={settings.announcement}
                  onChange={(e) => field("announcement", e.target.value)}
                />
              </label>
              <label>
                Grand titre
                <textarea
                  required
                  rows={2}
                  maxLength={200}
                  value={settings.headline}
                  onChange={(e) => field("headline", e.target.value)}
                />
                <small>La deuxième ligne s’affiche en italique.</small>
              </label>
              <label>
                Texte d’introduction
                <textarea
                  required
                  rows={3}
                  maxLength={700}
                  value={settings.intro}
                  onChange={(e) => field("intro", e.target.value)}
                />
              </label>
              <ImageField
                label="Photo d’accueil"
                value={settings.hero}
                onChange={(v) => field("hero", v)}
                onBusy={imageBusy}
              />
            </section>
            <section className="admin-panel form-panel">
              <h2>Notre maison</h2>
              <label>
                L’histoire de votre boucherie
                <textarea
                  required
                  rows={8}
                  maxLength={6000}
                  value={settings.story}
                  onChange={(e) => field("story", e.target.value)}
                />
              </label>
              <ImageField
                label="Photo de la maison"
                value={settings.storyImage}
                onChange={(v) => field("storyImage", v)}
                onBusy={imageBusy}
              />
            </section>
          </div>
          <aside>
            <section className="admin-panel form-panel">
              <h2>Pour vous retrouver</h2>
              <p>Affiché sur la page contact et au pied du site.</p>
              <label>
                Adresse complète
                <input
                  required
                  maxLength={250}
                  value={settings.address}
                  onChange={(e) => field("address", e.target.value)}
                />
              </label>
              <label>
                E-mail de contact
                <input
                  type="email"
                  required
                  maxLength={150}
                  value={settings.email}
                  onChange={(e) => field("email", e.target.value)}
                />
              </label>
              <label>
                Téléphone
                <input
                  type="tel"
                  maxLength={35}
                  value={settings.phone}
                  onChange={(e) => field("phone", e.target.value)}
                  placeholder="Votre numéro de téléphone"
                />
              </label>
              <label>
                Numéro WhatsApp de la boucherie
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={35}
                  value={settings.whatsapp}
                  onChange={(e) => field("whatsapp", e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                />
                <small>
                  Les clients pourront vous écrire avec une demande déjà
                  remplie. Utilisez le format international.
                </small>
              </label>
              <label>
                Horaires et informations de retrait
                <textarea
                  required
                  rows={7}
                  maxLength={1000}
                  value={settings.hours}
                  onChange={(e) => field("hours", e.target.value)}
                  placeholder="Mardi – samedi : …"
                />
              </label>
            </section>
            <div className="settings-tip whatsapp-tip">
              <Check size={19} />
              <div>
                <strong>WhatsApp, sans attendre.</strong>
                <p>
                  Ce numéro active le bouton de message après une commande. À
                  chaque Click & Collect, le client reçoit sa commande complète
                  dans WhatsApp et vous l’envoie directement.
                </p>
              </div>
            </div>
            <div className="settings-tip">
              <Check size={19} />
              <div>
                <strong>Votre site suit votre rythme.</strong>
                <p>
                  Vos modifications apparaissent après enregistrement et
                  actualisation de la boutique.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </form>
      <form
        className="admin-form admin-panel form-panel password-panel"
        onSubmit={password}
      >
        <h2>
          <LockKeyhole size={21} /> Votre accès propriétaire
        </h2>
        <p>Un mot de passe personnel pour garder les clés de votre boutique.</p>
        <div className="form-row">
          <label>
            Mot de passe actuel
            <input
              name="current"
              required
              type="password"
              autoComplete="current-password"
              maxLength={200}
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              name="password"
              required
              minLength={12}
              maxLength={200}
              type="password"
              autoComplete="new-password"
            />
            <small>12 caractères minimum.</small>
          </label>
        </div>
        {passwordMessage && <p role="status">{passwordMessage}</p>}
        <button className="button outline" disabled={passwordBusy}>
          {passwordBusy ? "Modification…" : "Changer mon mot de passe"}
        </button>
      </form>
    </>
  );
}
