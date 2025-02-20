import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import config from "../../res/config.js";

class WebCrawler {
  private jsonDir : string;
  private pdfDir : string;
  private fileCounter : number;

  constructor() {

    // Préparer les dossiers de sortie
    const baseDir = path.join("res", "crawl", config.domain);
    const jsonDir = path.join(baseDir, "json");
    const pdfDir = path.join(baseDir, "pdf");

    this.jsonDir = jsonDir;
    this.pdfDir = pdfDir;

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

    config.jsonOutputDir = jsonDir;
    config.pdfOutputDir = pdfDir;
    this.fileCounter = 1; // Pour numérotation des fichiers JSON

    if (!config.maxTokens) {
      config.maxTokens = 1000; // Par défaut, on prend 1000 tokens par fichier JSON si non précisé
    }
    if (!config.maxFileSize) {
      config.maxFileSize = 100; // Par défaut, on prend 100 Ko pour les tailles des fichiers PDF si non précisé
    }
  }

  async crawl() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(30000);

    const visited = new Set();
    const queue = [config.url];
    let visitCount = 0;
    let crawlCount = 0;
    let results = [];

    while (queue.length > 0 && crawlCount < config.maxPagesToCrawl) {
      const url = queue.shift();
      if (!url || visited.has(url)) continue;

      console.log(`\x1b[33mVisiting (${visitCount + 1}):\x1b[0m ${url}`);
      visited.add(url);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });

        let textContent;
        if (config.ukSelector) {
          textContent = await page.$$eval(config.ukSelector, (elements) =>
            elements.map((el) => (el.textContent ? el.textContent.trim() : "")).join(" ")
          );
        } else {
          textContent = await page.evaluate(
            () => document.querySelector("body")?.innerText || ""
          );
        }

        if (
          textContent.trim() &&
          this.matchesUrl(url) &&
          !this.isExcludedUrl(url)
        ) {
          console.log(
            `\x1b[37mCrawling (${crawlCount + 1}/${
              config.maxPagesToCrawl
            }):\x1b[0m ${url}`
          );

          let data : any = {};

          // Récupérer le titre de la page
          const pageTitle = await page.title();
          
          data = {
            ...data,
            title: pageTitle,
            text: textContent,
          };

          if (
            Array.isArray(config.selector) &&
            config.selector.length > 0
          ) {
            for (const selectorUnit of config.selector) {
              let { property, selector, number, where } = selectorUnit;

              where = where ? where : "children";

              const elements = await page.$$(selector);

              if (elements.length > 0) {
                if (number === "unique") {
                  let elementText;
                  if (where === "children") {
                    elementText = await elements[0].evaluate((el) =>
                      (el as HTMLElement).innerText.trim()
                    );
                  } else if (where === "attribute") {
                    if (selector.includes("src")) {
                      elementText = await elements[0].evaluate(
                        (el) => el.getAttribute("src") || ""
                      );
                    }
                  }
                  data[property] = elementText;
                } else if (number === "array") {
                  let elementArray;
                  if (where === "children") {
                    elementArray = await Promise.all(
                      elements.map((el) =>
                        el.evaluate((el) => (el as HTMLElement).innerText.trim())
                      )
                    );
                  } else if (where === "attribute") {
                    if (selector.includes("src")) {
                      elementArray = await Promise.all(
                        elements.map((el) =>
                          el.evaluate((el) => el.getAttribute("src") || "")
                        )
                      );
                    }
                  }
                  data[property] = elementArray;
                }
              }
            }
          }

          results.push({
            url,
            ...data,
          });

          crawlCount++;
        }

        // Sauvegarder le fichier si la taille ou le nombre d'unités dépasse la limite
        if (config.maxTokens && config.maxFileSize) {
          if (
            results.length >= config.maxTokens ||
            this.getBatchSize(results) >= config.maxFileSize * 1024
          ) {
            this.saveBatch(results);
            results = [];
          }
        }

        const links = await page.$$eval("a[href]", (anchors) =>
          anchors.map((a) => a.href)
        );

        // Télécharger les PDFs trouvés sur la page
        const pdfLinks = links.filter((link) => link.endsWith(".pdf"));
        for (const pdfLink of pdfLinks) {
          await this.downloadPdf(pdfLink);
        }

        // Ajouter les liens à la queue
        queue.push(
          ...links.filter(
            (link) =>
              !visited.has(link) &&
              link.startsWith(config.url) &&
              link !== url
          )
        );
        visitCount++;
      } catch (err : any) {
        console.error(
          `Error crawling ${url}: ${err.message} ${config.selector}`
        );
        this.logError(url, err.message);
      }
    }

    if (results.length > 0) {
      this.saveBatch(results);
    }

    await browser.close();
    console.log(`\x1b[35mCrawling completed!\x1b[0m`);
  }

   private matchesUrl(url : string) : boolean {
    let result = url.startsWith(config.url);
    if (config.matchers && config.matchers.length > 0) {
      let resultMatcher = config.matchers.some((matcher : string) =>
        url.startsWith(matcher)
      );
      result = result && resultMatcher;
    }
    return result;
  }

  private isExcludedUrl(url : string) : boolean {
    let result = config.exclude
      ? config.exclude.some((pattern : string) => url.startsWith(pattern))
      : false;
    return result;
  }

  private getBatchSize(batch : any) : number {
    const jsonString = JSON.stringify(batch, null, 2);
    return Buffer.byteLength(jsonString, "utf8");
  }

  private saveBatch(batch : any) : void {
    const fileName = `${config.domain}-${this.fileCounter}.json`;
    const outputFilePath = path.join(this.jsonDir, fileName);

    // Sauvegarder le batch
    fs.writeFileSync(outputFilePath, JSON.stringify(batch, null, 2));
    console.log(`\x1b[34mSaved results to:\x1b[0m ${outputFilePath}`);

    // Incrémenter le compteur de fichier
    this.fileCounter++;
  }

  private async downloadPdf(pdfUrl : string) : Promise<void> {
    try {
      const response = await axios.get(pdfUrl, {
        responseType: "arraybuffer",
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const pdfBuffer = Buffer.from(response.data);
      const fileName = path.basename(pdfUrl);
      const filePath = path.join(this.pdfDir, fileName);

      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`\x1b[36mDownloaded PDF:\x1b[0m ${filePath}`);
    } catch (error : any) {
      console.error(`Error downloading PDF ${pdfUrl}: ${error.message}`);
      this.logError(pdfUrl, error.message);
    }
  }

  logError(url : string, errorMessage : string) {
    const logPath = path.join(config.jsonOutputDir, "../error_log.txt");
    const logMessage = `[${new Date().toISOString()}] Error crawling ${url}: ${errorMessage}\n`;
    fs.appendFileSync(logPath, logMessage);
    console.log(`Logged error for ${url}`);
  }
}

export default WebCrawler;
