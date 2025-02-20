import config from "../res/config.js";
import ChatBot from "./lib/ChatBot.js";

const chatBot = new ChatBot();
chatBot
  .init()
  .then(() => {
    console.log(
      "GenerateBot initialisé avec succès avec le domaine ",
      config.domain
    );
    // Démarrer le chat interactif
    chatBot.startInteractiveGenerate();
  })
  .catch((err) =>
    console.log("Erreur lors de l'initialisation du genrate bot ", err)
  );
