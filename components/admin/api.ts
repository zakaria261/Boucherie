"use client";

/** Appel JSON aux API d'administration, avec messages d'erreur lisibles. */
export async function api<T = Record<string, unknown>>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Pas de connexion. Vérifiez le réseau puis réessayez.");
  }
  let result: Record<string, unknown> = {};
  try {
    result = await response.json();
  } catch {
    if (!response.ok)
      throw new Error("Le serveur ne répond pas. Réessayez dans un instant.");
  }
  if (response.status === 401) {
    // Session expirée : retour à la connexion, puis à l'écran en cours.
    window.location.assign(
      `/admin/connexion?suite=${encodeURIComponent(window.location.pathname)}`,
    );
    throw new Error("Session expirée. Reconnectez-vous.");
  }
  if (!response.ok)
    throw new Error(String(result.error || "Impossible d’enregistrer."));
  return result as T;
}

let switchInput: HTMLLabelElement | null = null;

/**
 * Retour haptique léger lorsque l'appareil le permet :
 * - Android et navigateurs compatibles : API Vibration ;
 * - iPhone (Safari 18 et plus) : interrupteur natif invisible, qui déclenche
 *   le retour haptique du système. Ailleurs, rien ne se passe et seul le
 *   retour visuel des boutons reste.
 */
export function haptic(kind: "light" | "success" | "warning" = "light") {
  try {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator;
    if (typeof nav.vibrate === "function") {
      nav.vibrate(kind === "light" ? 8 : kind === "success" ? [10, 40, 12] : [20, 60, 20]);
      return;
    }
    if (!/iPhone|iPad/.test(nav.userAgent)) return;
    if (!switchInput) {
      switchInput = document.createElement("label");
      switchInput.setAttribute("aria-hidden", "true");
      switchInput.style.cssText =
        "position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      switchInput.appendChild(input);
      document.body.appendChild(switchInput);
    }
    switchInput.click();
  } catch {}
}

/** L'application est-elle lancée depuis l'écran d'accueil (mode « app ») ? */
function standalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || matchMedia("(display-mode: standalone)").matches;
}

/**
 * Ouvre une page du site public en dehors de l'application : dans Safari sur
 * iPhone (comme le ferait une app native), dans un nouvel onglet ailleurs.
 * Sans cela, l'app de l'écran d'accueil afficherait le site à sa place.
 */
export function openSite(event: { preventDefault: () => void }, href: string) {
  const url = new URL(href, window.location.origin).toString();
  event.preventDefault();
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && standalone()) {
    // Schéma de Safari (iOS 17 et plus) : ouvre directement l'app Safari.
    // Versions plus anciennes : l'app reste au premier plan, on ouvre alors
    // la page dans le navigateur intégré, avec son bouton « OK » pour revenir.
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") window.open(url, "_blank", "noopener");
    }, 700);
    document.addEventListener("visibilitychange", () => clearTimeout(timer), { once: true });
    window.location.href = `x-safari-${url}`;
    return;
  }
  window.open(url, "_blank", "noopener");
}
