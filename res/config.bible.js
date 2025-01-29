import commonConfig from "./common.config.js";

const configBible = {
  ...commonConfig,
  // Configuration du web crawler
  // URL à visiter
  url: "https://www.bible.com/fr/bible",
  exclude: [
    "https://www.bible.com/fr/audio-bible-app-versions",
    "https://www.bible.com/fr/videos",
    "https://www.bible.com/fr/reading-plans",
  ],
  selector:
    "div.bg-canvas-light.rounded-1.mbs-1.md\\:mbs-4.mis-1.mie-1.md\\:mis-4.md\\:mie-4.plb-2.pli-2.md\\:pli-4.md\\:plb-4",

  // Chemin pour stocker les résultats du web crawler
  // Domaine de chat ou de génération de l'IA
  domain: "bible",
};

export default configBible;
