import { ConfigType } from "./common.config.js";

const domain = 'bible';

async function loadConfig() {
  const { default: domainConfig } = await import(`./config.${domain}.js`);
  return domainConfig;
}

const config : ConfigType = await loadConfig(); // Assure-toi d'être dans un contexte `async`
export default config;
