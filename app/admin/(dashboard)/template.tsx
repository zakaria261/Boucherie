import { ViewTransition } from "react";

/**
 * Chaque écran est remonté à la navigation : on anime son entrée et sa sortie
 * comme sur iOS (« push » vers un détail, « pop » au retour). Les changements
 * d'onglet n'ont pas de type : l'écran change instantanément.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-push": "ios-push", "nav-pop": "ios-pop", default: "none" }}
      exit={{ "nav-push": "ios-push", "nav-pop": "ios-pop", default: "none" }}
      default="none"
    >
      <div className="screen-page">{children}</div>
    </ViewTransition>
  );
}
