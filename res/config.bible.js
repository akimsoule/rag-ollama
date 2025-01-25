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

  // Chemin pour stocker les résultats du web crawler
  // Domaine de chat ou de génération de l'IA
  domain: "bible",
};

export default configBible;
