// Runs before the page paints, so a saved dark theme never flashes light.
export const themeScript = `(function(){var t;try{t=localStorage.getItem('faubourg-theme')}catch(e){}document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`;
