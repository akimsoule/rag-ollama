Voici une mise à jour du fichier `README.md` avec des informations sur la configuration :

# **Rag-Ollama**

Un projet d'indexation et d'interrogation de base de données vectorielle avec LanceDB et Ollama.

**Projet créé par** : akim.soule

**Description du projet**

Ce projet a pour objectif principal l'indexation et l'interrogation de bases de données vectorielles utilisant la librairie LanceDB et la bibliothèque Ollama.

**Exécution des scripts**

Les commandes suivantes peuvent être exécutées dans le répertoire du projet :

- `npm run crawler` : lance le script d'extraction de données via le WebCrawler
- `npm run index` : lance le script d'indexation de données avec LanceDB et Ollama
- `npm run generate` : génère un bot à partir des données indexées
- `npm run chat` : lance une conversation avec le bot généré
- `npm run chat "Spécialiste en culture générale"` : lance une conversation avec le bot généré avec une thématique


**Configuration**

Pour configurer les fichiers de configuration, vous devez modifier les fichiers suivants :

- `res/common.config.js` : contient les paramètres généraux du projet
- `res/config.bible.js` : est un exemple de configuration pour la bible.
- `res/config.fisc.js` : est un exemple de configuration pour la fiscalité.

Vous devez modifier ces fichiers en fonction de vos besoins, notamment en ajustant les chemins d'accès aux données, les paramètres de recherche, etc.

**Exemple de configuration**

Voici un exemple de fichier `res/common.config.js` :

```javascript
const commonConfig = {
  maxPagesToCrawl: 100, //nombre de pages à crawler
  maxFileSize: 1000, // Taille max en Ko
  maxTokens: 50, // Nombre max d'unités par fichier
  model: "llama3.2:3b", // Configuration pour le modèle
};
```

Ce fichier configure l'extraction de données via le WebCrawler pour aller chercher les données à l'URL spécifiée.
Le nombre maximum d'urls à parser est de 100,
La taille des fichiers doit être maximum de 1000 ko.
Le nombre d'unités dans le fichier doit être maximum de 50.
Le modèle utilisé pour le chat ou la génération est llama3.2:3b.

**Auteur**

akim.soule

Je vous invite à noter que cette génération automatique peut ne pas être parfaitement adaptée au contenu du projet, il faudra donc adapter le fichier `README.md` en fonction de vos besoins.
