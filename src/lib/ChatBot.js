import lancedb from "vectordb";
import readline from "readline";
import ollama from "ollama";
import IndexDb from "./IndexDb.js";
import config from "../../res/config.js";

class ChatBot {
  #dbPath;
  #history = [];
  #maxHistorySize;

  
  constructor(subject, maxHistorySize = 5) {
    this.#dbPath = `data/lancedb/${config.domain}`;
    this.orgName = subject ?? config.domain;
    this.model = config.model;
    this.#maxHistorySize = maxHistorySize; // Taille maximale de l'historique
  }

  async init() {
    // Initialise et vérifie la base de données
    this.db = await lancedb.connect(this.#dbPath);
    if (!this.db) {
      throw new Error("Impossible de se connecter à la base de données");
    }
  }

  async #queryDatabase(query, limit = 5) {
    try {
      const embeddingFunction = await IndexDb.getEmbeddedFunction();
      const table = await this.db.openTable(this.orgName, embeddingFunction);
      const results = await table
        .search(query)
        .metricType("cosine")
        .limit(limit)
        .execute();

      return results
        .map((result) => (result.text ? result.text : ""))
        .filter((text) => text.trim() !== "");
    } catch (error) {
      console.error("Erreur lors de la requête à la base de données :", error);
      return [];
    }
  }

  // Gérer l'historique des messages
  updateHistory(role, content) {
    this.#history.push({ role, content });
    if (this.#history.length > this.#maxHistorySize) {
      this.#history.shift(); // Supprimer le message le plus ancien si la taille dépasse la limite
    }
  }

  async chat(userMessage) {
    try {
      // Ajouter le message de l'utilisateur à l'historique
      this.updateHistory("user", userMessage);

      console.log("Génération en cours ...");
      const messages = [
        {
          role: "system",
          content: "Tu es un assistant spécialiste dans le domaine : " + this.orgName,
        },
        ...this.#history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        { role: "user", content: userMessage },
      ];

      const response = await ollama.chat({
        model: this.model,
        stream: true,
        keep_alive: 5,
        messages: messages,
      });

      process.stdout.write("ChatBot : ");
      for await (const part of response) {
        process.stdout.write(part.message.content);
      }
      console.log(); // Ajoute une nouvelle ligne après la réponse
    } catch (error) {
      console.error("Erreur lors du chat :", error);
    }
  }

  async generate(userMessage) {
    const relatedDocs = await this.#queryDatabase(userMessage);
    const prompt = this.createPrompt(userMessage, relatedDocs);

    // Ajouter le message de l'utilisateur à l'historique
    this.updateHistory("user", userMessage);

    try {
      console.log("Génération en cours ...");
      const response = await ollama.generate({
        model: this.model,
        stream: true,
        prompt: prompt,
      });

      process.stdout.write("ChatBot : ");
      for await (const part of response) {
        process.stdout.write(part.response);
      }
      console.log(); // Ajoute une nouvelle ligne après la réponse
    } catch (error) {
      console.error("Erreur lors du chat :", error);
    }
  }

  startInteractiveChat() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(
      `Bienvenue dans le ChatBot du domaine '${this.orgName}'! Tapez votre message ou 'quit' pour quitter.\n`
    );

    const askQuestion = async () => {
      rl.question("Vous : ", async (userMessage) => {
        if (["quit", "exit"].includes(userMessage.toLowerCase())) {
          console.log("Au revoir !");
          rl.close();
          return;
        }

        try {
          await this.chat(userMessage);
        } catch (error) {
          console.error("Erreur : ", error.message);
        }

        askQuestion();
      });
    };

    askQuestion();
  }

  startInteractiveGenerate() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(
      `Bienvenue dans le ChatBot de ${this.orgName}! Tapez votre message ou 'quit' pour quitter.\n`
    );

    const askQuestion = async () => {
      rl.question("Vous : ", async (userMessage) => {
        if (["quit", "exit"].includes(userMessage.toLowerCase())) {
          console.log("Au revoir !");
          rl.close();
          return;
        }

        try {
          await this.generate(userMessage);
        } catch (error) {
          console.error("Erreur : ", error.message);
        }

        askQuestion();
      });
    };

    askQuestion();
  }

  createPrompt(question, context) {
    let prompt =
      "Répondez à la question en français en fonction du contexte ci-dessous.\n\n" +
      "Contexte:\n";

    prompt += context
      .map((c) => c)
      .join("\n\n---\n\n")
      .substring(0, 3750);

    prompt += `\n\nQuestion : ${question}`;
    return prompt;
  }
}

export default ChatBot;
