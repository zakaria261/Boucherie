/**
 * Écran affiché instantanément pendant le chargement d'un onglet : la barre
 * d'onglets réagit tout de suite et la mise en page ne saute pas.
 */
export default function Loading() {
  return (
    <div className="skeleton-screen" aria-busy="true" aria-label="Chargement">
      <header className="nav-bar" />
      <div className="large-title">
        <span className="skeleton skeleton-title" />
      </div>
      <div className="content">
        <span className="skeleton skeleton-search" />
        <div className="group-body">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="row skeleton-row" key={i}>
              <span className="skeleton skeleton-thumb" />
              <span className="skeleton-lines">
                <span className="skeleton" style={{ width: `${70 - i * 6}%` }} />
                <span className="skeleton short" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
