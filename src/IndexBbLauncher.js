import IndexUtil from "./lib/IndexDb.js";

const index = new IndexUtil();
index
  .initDB()
  .then(() => {
    console.log("Base de données initialisée avec succès.");
  })
  .catch(() => {
    console.error("Erreur lors de l'initialisation de la base de données.");
  });
