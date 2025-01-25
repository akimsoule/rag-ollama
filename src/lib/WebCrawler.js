import puppeteer from "puppeteer";
import * as fs from "fs";
import path from "path";
import axios from "axios";
import config from "../../res/config.js";

class WebCrawler {
  #jsonDir;
  #pdfDir;

  constructor() {
    this.config = config;

    // Préparer les dossiers de sortie
    const baseDir = path.join("res", "crawl", config.domain);
    const jsonDir = path.join(baseDir, "json");
    const pdfDir = path.join(baseDir, "pdf");

    this.#jsonDir = jsonDir;
    this.#pdfDir = pdfDir;

    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    this.config.jsonOutputDir = jsonDir;
    this.config.pdfOutputDir = pdfDir;
    this.fileCounter = 1; // Pour numérotation des fichiers JSON

    if (!this.config.maxTokens) {
      this.config.maxTokens = 1000; // Par défaut, on prend 1000 tokens par fichier JSON si non précisé
    }
    if (!this.config.maxFileSize) {
      this.config.maxFileSize = 100; // Par défaut, on prend 100 Ko pour les tailles des fichiers PDF si non précisé
    }
  }

  async crawl() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(30000);

    const visited = new Set();
    const queue = [this.config.url];
    let pageCount = 0;
    let results = [];

    while (queue.length > 0 && pageCount < this.config.maxPagesToCrawl) {
      const url = queue.shift();
      if (visited.has(url)) continue;

      // Vérifier si l'URL correspond au match et n'est pas exclue
      if (!this.#matchesUrl(url) || this.#isExcludedUrl(url)) {
        continue;
      }

      console.log(
        `\x1b[33mCrawling (${pageCount + 1}/${
          this.config.maxPagesToCrawl
        }):\x1b[0m ${url}`
      );
      visited.add(url);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Récupérer uniquement le texte visible
        const textContent = await page.evaluate(() => document.body.innerText);

        if (textContent && textContent.trim() !== "") {
          results.push({
            url: url,
            title: await page.title(),
            text: textContent.trim(),
          });
          pageCount++;
        }

        // Sauvegarder le fichier si la taille ou le nombre d'unités dépasse la limite
        if (this.config.maxTokens && this.config.maxFileSize) {
          if (
            results.length >= this.config.maxTokens ||
            this.#getBatchSize(results) >= this.config.maxFileSize * 1024
          ) {
            this.#saveBatch(results);
            results = [];
          }
        }

        // Récupérer les liens valides de la page
        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]"), (link) => link.href)
        );

        // Télécharger les PDFs trouvés sur la page
        const pdfLinks = links.filter((link) => link.endsWith(".pdf"));
        for (const pdfLink of pdfLinks) {
          await this.#downloadPdf(pdfLink);
        }

        // Ajouter les liens à la queue
        queue.push(
          ...links.filter(
            (link) => !visited.has(link) && this.#matchesUrl(link)
          )
        );
      } catch (err) {
        console.error(`Error crawling ${url}: ${err.message}`);
        this.#logError(url, err.message);
      }
    }

    if (results.length > 0) {
      this.#saveBatch(results);
    }

    await browser.close();
    console.log(`\x1b[35mCrawling completed!\x1b[0m`);
  }

  #matchesUrl(url) {
    let result = url.startsWith(config.url);
    return result;
  }

  #isExcludedUrl(url) {
    let result = this.config.exclude
      ? this.config.exclude.some((pattern) => url.startsWith(pattern))
      : false;
    return result;
  }

  #getBatchSize(batch) {
    const jsonString = JSON.stringify(batch, null, 2);
    return Buffer.byteLength(jsonString, "utf8");
  }

  #saveBatch(batch) {
    const fileName = `${this.config.domain}-${this.fileCounter}.json`;
    const outputFilePath = path.join(this.#jsonDir, fileName);

    // Sauvegarder le batch
    fs.writeFileSync(outputFilePath, JSON.stringify(batch, null, 2));
    console.log(`\x1b[34mSaved results to:\x1b[0m ${outputFilePath}`);

    // Incrémenter le compteur de fichier
    this.fileCounter++;
  }

  async #downloadPdf(pdfUrl) {
    try {
      const response = await axios.get(pdfUrl, {
        responseType: "arraybuffer",
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const pdfBuffer = Buffer.from(response.data);
      const fileName = path.basename(pdfUrl);
      const filePath = path.join(this.#pdfDir, fileName);

      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`\x1b[36mDownloaded PDF:\x1b[0m ${filePath}`);
    } catch (error) {
      console.error(`Error downloading PDF ${pdfUrl}: ${error.message}`);
      this.logError(pdfUrl, error.message);
    }
  }

  #logError(url, errorMessage) {
    const logPath = path.join(this.config.jsonOutputDir, "../error_log.txt");
    const logMessage = `[${new Date().toISOString()}] Error crawling ${url}: ${errorMessage}\n`;
    fs.appendFileSync(logPath, logMessage);
    console.log(`Logged error for ${url}`);
  }
}

export default WebCrawler;
