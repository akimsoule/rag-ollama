import ChatBot from "./lib/ChatBot.js";

const subject = process.argv[2];

let chatBot: ChatBot;
if (subject) {
  chatBot = new ChatBot(subject);
} else {
  chatBot = new ChatBot();
}

chatBot
  .init()
  .then(() => {
    console.log(
      "ChatBot initialisé avec succès avec le domaine ",
      chatBot.orgName
    );
    // Démarrer le chat interactif
    chatBot.startInteractiveChat();
  })
  .catch((err) =>
    console.log("Erreur lors de l'initialisation du chat bot ", err)
  );
