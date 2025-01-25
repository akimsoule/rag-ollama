import config from "../config.js";
import ChatBot from "./lib/ChatBot.js";

const chatBot = new ChatBot();
await chatBot
  .init()
  .then(() => {
    console.log(
      "GenerateBot initialisé avec succès avec le domaine ",
      config.domain
    );
  })
  .catch((err) =>
    console.log("Erreur lors de l'initialisation du genrate bot ", err)
  );

// Démarrer le chat interactif
chatBot.startInteractiveGenerate(chatBot);
