import commonConfig from "./common.config.js";

const configFisc = {
  ...commonConfig,
  // Configuration du web crawler
  // URL à visiter
  url: "https://www.canada.ca/fr/agence-revenu/",
  exclude: [],

  // Chemin pour stocker les résultats du web crawler
  // Domaine de chat ou de génération de l'IA
  domain: "fisc",
};

export default configFisc;
