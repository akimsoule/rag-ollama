import WebCrawler from "./lib/WebCrawler.js";

const crawler = new WebCrawler();
crawler.crawl().then(() => {
  console.log("Crawling terminé, y compris les fichiers PDF !");
});
