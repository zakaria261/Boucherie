"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  CircleHelp,
  Download,
  ExternalLink,
  KeyRound,
  ListChecks,
  LogOut,
  Moon,
  Share,
  SquarePlus,
  Store,
} from "lucide-react";
import { api } from "./api";
import { NavHeader, Row, Section, Sheet, useHud } from "./ui";

export function MoreScreen({ email, todo }: { email: string; todo: number }) {
  const router = useRouter();
  const [appearance, setAppearance] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <NavHeader title="Plus" />
      <div className="content">
        <Section title="Boutique">
          <Row href="/admin/plus/boutique" icon={<span className="row-icon tone-red"><Store size={17} /></span>} label="Ma boutique" detail="Coordonnées, WhatsApp, textes et photos" />
          <Row href="/admin/plus/retraits" icon={<span className="row-icon tone-orange"><CalendarClock size={17} /></span>} label="Horaires et retraits" detail="Ouverture, créneaux, délais, fermetures" />
          <Row
            href="/admin/plus/mise-en-ligne"
            icon={<span className="row-icon tone-yellow"><ListChecks size={17} /></span>}
            label="Avant la mise en ligne"
            value={todo ? <span className="pill orange">{todo}</span> : undefined}
          />
        </Section>
        <Section title="Application">
          <Row href="/admin/plus/notifications" icon={<span className="row-icon tone-red"><Bell size={17} /></span>} label="Notifications" />
          <Row onClick={() => setAppearance(true)} icon={<span className="row-icon tone-gray"><Moon size={17} /></span>} label="Apparence" />
          <Row href="/admin/plus/aide" icon={<span className="row-icon tone-blue"><SquarePlus size={17} /></span>} label="Installer sur l’iPhone" />
        </Section>
        <Section title="Compte">
          <Row href="/admin/plus/compte" icon={<span className="row-icon tone-gray"><KeyRound size={17} /></span>} label="Sécurité" detail={email} />
          <Row href="/admin/plus/sauvegarde" icon={<span className="row-icon tone-green"><Download size={17} /></span>} label="Sauvegarde" />
          <Row href="/" external icon={<span className="row-icon tone-gray"><ExternalLink size={17} /></span>} label="Voir le site" />
        </Section>
        <Section>
          <button
            type="button"
            className="row destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/api/auth/logout", "POST");
              } finally {
                router.replace("/admin/connexion");
                router.refresh();
              }
            }}
          >
            <span className="row-icon tone-red">
              <LogOut size={17} />
            </span>
            <span className="row-label">Se déconnecter</span>
          </button>
        </Section>
        <p className="list-footer">Faubourg Pro · Boucherie du Faubourg</p>
      </div>
      <Sheet open={appearance} onClose={() => setAppearance(false)} title="Apparence">
        <AppearancePicker />
      </Sheet>
    </>
  );
}

const THEME_KEY = "faubourg-theme";
function AppearancePicker() {
  const [value, setValue] = useState("auto");
  useEffect(() => {
    try {
      setValue(localStorage.getItem(THEME_KEY) || "auto");
    } catch {}
  }, []);
  function choose(v: string) {
    setValue(v);
    try {
      if (v === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, v);
    } catch {}
    document.documentElement.dataset.theme =
      v === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : v;
  }
  return (
    <div className="group-body" role="radiogroup" aria-label="Apparence">
      {[
        ["auto", "Automatique", "Suit le réglage de l’iPhone"],
        ["light", "Clair", ""],
        ["dark", "Sombre", ""],
      ].map(([v, label, detail]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className="row" onClick={() => choose(v)}>
          <span className="row-text">
            <span className="row-label">{label}</span>
            {detail && <span className="row-detail">{detail}</span>}
          </span>
          {value === v && <span className="row-value link">✓</span>}
        </button>
      ))}
    </div>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState =
  | "loading"
  | "unsupported"
  | "install"
  | "denied"
  | "off"
  | "on";

export function NotificationsScreen() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { hud, show } = useHud();

  async function check() {
    const standalone =
      matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
      return setState(ios && !standalone ? "install" : "unsupported");
    if (Notification.permission === "denied") return setState("denied");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return setState("off");
      const r = await fetch(`/api/admin/push?endpoint=${encodeURIComponent(sub.endpoint)}`, { cache: "no-store" });
      const { subscribed } = await r.json();
      setState(subscribed ? "on" : "off");
    } catch {
      setState("off");
    }
  }
  useEffect(() => {
    void check();
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch("/api/admin/push", { cache: "no-store" })).json();
      let sub = await reg.pushManager.getSubscription();
      if (!sub)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      await api("/api/admin/push", "POST", sub.toJSON());
      setState("on");
      show("Notifications activées");
    } catch (e) {
      setMessage((e as Error).message || "Activation impossible.");
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/api/admin/push", "DELETE", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setMessage("");
    try {
      const { result } = await api<{ result: string }>("/api/admin/push/test", "POST");
      setMessage(
        result === "sent"
          ? "Notification transmise. Elle doit apparaître dans quelques secondes."
          : result === "failed"
            ? "Le service de notification a refusé l’envoi. Désactivez puis réactivez les notifications."
            : "Aucun appareil abonné.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NavHeader title="Notifications" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <Section
          title="Sur cet appareil"
          footer="Vous êtes prévenu à chaque nouvelle commande. Toucher la notification ouvre directement la commande (connexion requise)."
        >
          <div className="row">
            <span className="row-text">
              <span className="row-label">État</span>
            </span>
            <span className="row-value">
              {
                {
                  loading: "…",
                  unsupported: "Non pris en charge",
                  install: "Installation requise",
                  denied: "Refusées",
                  off: "Désactivées",
                  on: "Activées",
                }[state]
              }
            </span>
          </div>
        </Section>
        {state === "install" && (
          <p className="intro-text">
            Sur iPhone, les notifications ne fonctionnent que dans l’application
            installée sur l’écran d’accueil (iOS 16.4 ou plus récent). Suivez le
            guide <a href="/admin/plus/aide">Installer sur l’iPhone</a>, puis
            revenez ici depuis l’application.
          </p>
        )}
        {state === "denied" && (
          <p className="intro-text">
            Les notifications ont été refusées. Sur iPhone : Réglages →
            Notifications → Faubourg Pro → Autoriser les notifications. Revenez
            ensuite sur cet écran.
          </p>
        )}
        {state === "unsupported" && (
          <p className="intro-text">
            Ce navigateur ne permet pas les notifications. Les nouvelles
            commandes restent signalées dans l’application, avec une pastille
            sur l’onglet Commandes.
          </p>
        )}
        <div className="sheet-buttons">
          {state === "off" && (
            <button type="button" className="btn filled large" disabled={busy} onClick={() => void enable()}>
              Activer les notifications
            </button>
          )}
          {state === "on" && (
            <>
              <button type="button" className="btn tinted large" disabled={busy} onClick={() => void test()}>
                Envoyer une notification de test
              </button>
              <button type="button" className="btn plain destructive-text" disabled={busy} onClick={() => void disable()}>
                Désactiver sur cet appareil
              </button>
            </>
          )}
        </div>
        {message && <p className="intro-text" role="status">{message}</p>}
      </div>
      {hud}
    </>
  );
}

export function AccountScreen({ email }: { email: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { hud, show } = useHud();
  return (
    <>
      <NavHeader title="Sécurité" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <form
        className="content"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/api/auth/password", "POST", { current, password: next });
            setCurrent("");
            setNext("");
            show("Mot de passe mis à jour");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Section title="Compte propriétaire">
          <div className="row">
            <span className="row-label">E-mail</span>
            <span className="row-value">{email}</span>
          </div>
        </Section>
        <Section
          title="Changer le mot de passe"
          footer="Au moins 12 caractères. Les autres appareils connectés seront déconnectés."
        >
          <label className="field">
            <span>Mot de passe actuel</span>
            <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="field">
            <span>Nouveau mot de passe</span>
            <input type="password" autoComplete="new-password" minLength={12} required value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
        </Section>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="sheet-buttons">
          <button className="btn filled large" disabled={busy}>
            Changer mon mot de passe
          </button>
          <button
            type="button"
            className="btn plain destructive-text"
            onClick={async () => {
              try {
                await api("/api/auth/logout", "POST");
              } finally {
                router.replace("/admin/connexion");
                router.refresh();
              }
            }}
          >
            Se déconnecter
          </button>
        </div>
      </form>
      {hud}
    </>
  );
}

export function HelpScreen() {
  return (
    <>
      <NavHeader title="Installer sur l’iPhone" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <p className="intro-text">
          Faubourg Pro s’installe comme une application, sans passer par l’App
          Store. Elle s’ouvre en plein écran, directement sur vos commandes.
        </p>
        <ol className="help-steps">
          <li>
            <strong>Ouvrez Safari</strong> à l’adresse de votre site suivie de
            <code>/admin</code>, et connectez-vous.
          </li>
          <li>
            Touchez le bouton <strong>Partager</strong>{" "}
            <Share size={17} aria-label="(carré avec une flèche)" /> en bas de l’écran.
          </li>
          <li>
            Choisissez <strong>Sur l’écran d’accueil</strong>{" "}
            <SquarePlus size={17} aria-hidden="true" />. Le nom proposé est
            « Faubourg Pro » : touchez <strong>Ajouter</strong>.
          </li>
          <li>
            Ouvrez l’application depuis son icône bordeaux, connectez-vous une
            fois en cochant « Rester connecté », puis activez les{" "}
            <a href="/admin/plus/notifications">notifications</a>.
          </li>
        </ol>
        <Section title="Bon à savoir">
          <div className="row">
            <span className="row-text">
              <span className="row-detail">
                L’application installée a sa propre connexion, distincte de
                Safari. Si vous êtes déconnecté, reconnectez-vous simplement
                dans l’application.
              </span>
            </span>
          </div>
          <div className="row">
            <span className="row-text">
              <span className="row-detail">
                Sur Android (Chrome) : menu ⋮ → Installer l’application.
              </span>
            </span>
          </div>
        </Section>
        <Row href="/admin" icon={<span className="row-icon tone-blue"><CircleHelp size={17} /></span>} label="Retour à Aujourd’hui" />
      </div>
    </>
  );
}

export function BackupScreen() {
  return (
    <>
      <NavHeader title="Sauvegarde" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <p className="intro-text">
          Téléchargez une copie complète des données : produits, prix,
          commandes, promotions, publications, recettes et réglages. Gardez-la
          sur un ordinateur ou un stockage en ligne.
        </p>
        <div className="sheet-buttons">
          <a className="btn filled large" href="/api/admin/sauvegarde" download>
            <Download size={19} /> Télécharger les données
          </a>
        </div>
        <Section title="Photos et restauration">
          <div className="row">
            <span className="row-text">
              <span className="row-detail">
                Les photos importées sont stockées à part (Vercel Blob en
                ligne). La personne qui gère l’hébergement peut tout
                sauvegarder, photos comprises, et restaurer avec les commandes
                « npm run backup » et « npm run restore » (voir le fichier
                README). Turso garde aussi un historique de la base.
              </span>
            </span>
          </div>
        </Section>
      </div>
    </>
  );
}

export function LaunchChecklist({ items }: { items: { label: string; done: boolean; href?: string; hint?: string }[] }) {
  return (
    <>
      <NavHeader title="Avant la mise en ligne" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <p className="intro-text">
          Les points restants avant d’ouvrir la commande en ligne au public.
        </p>
        <div className="group-body">
          {items.map((i) => (
            <Row
              key={i.label}
              href={i.href}
              chevron={!!i.href}
              icon={<span className={`row-icon ${i.done ? "tone-green" : "tone-yellow"}`}>{i.done ? "✓" : "!"}</span>}
              label={i.label}
              detail={i.hint}
            />
          ))}
        </div>
      </div>
    </>
  );
}
