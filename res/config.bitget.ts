import commonConfig, { ConfigType } from "./common.config.js";


const config : ConfigType = {
  ...commonConfig,
  // Configuration du web crawler
  // URL à visiter
  url: "https://github.com/tiagosiebler/bitget-api/tree/master/examples",
  exclude: [],

  // Chemin pour stocker les résultats du web crawler
  // Domaine de chat ou de génération de l'IA
  domain: "bitget",
};

export default config;
