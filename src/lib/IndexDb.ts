import * as path from "path";
import * as fs from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as lancedb from "vectordb";
import config from "../../res/config.js";

class IndexDb {
  private orgName : string;
  private srcPath : string;

  constructor() {
    this.orgName = config.domain;
    this.srcPath = path.join(".", "res", "crawl", config.domain);
  }

  public async initDB() {
    // Réinitialiser le dossier de la base de données
    fs.rmSync(path.join("data", "lancedb", this.orgName), {
      recursive: true,
      force: true,
    });
    fs.mkdirSync(path.join("data", "lancedb", this.orgName), {
      recursive: true,
    });

    const db = await lancedb.connect("data/lancedb/" + this.orgName);
    let data = await this.getAllDocs();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 5000,
      chunkOverlap: 0,
      separators: ["\n", ".", "?", "!"],
    });

    let dataSplit = await splitter.splitDocuments(data);
    const splitDocs = dataSplit.map((doc) => ({
      text: doc.pageContent,
      source: doc.metadata.source,
      title: doc.metadata.title,
      domain: doc.metadata.domain,
      fileName: doc.metadata.fileName,
    }));

    let limit = 1000;
    let embeddingFunction = await IndexDb.getEmbeddedFunction();

    for (let index = 0; index < splitDocs.length; index += limit) {
      let splitDocsSliced = splitDocs.slice(index, index + limit);
      await db.createTable(this.orgName, splitDocsSliced, embeddingFunction, {
        writeMode: lancedb.WriteMode.Append,
      });
      console.log(
        `Loaded ${splitDocsSliced.length} documents, ${(
          ((index + splitDocsSliced.length) / splitDocs.length) *
          100
        ).toFixed(2)}% complete`
      );
    }
  }

  public static async getEmbeddedFunction() {
    // Utilisation de dynamic import pour @xenova/transformers
    const { pipeline } = await import("@xenova/transformers");
    const pipe = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    const embed_fun = {
      sourceColumn: "text",
      embed: async (batch : string[]) => {
        let result = [];
        for (let text of batch) {
          const res = await pipe(text, { pooling: "mean", normalize: true });
          result.push(Array.from(res["data"]));
        }
        return result;
      },
    };
    return embed_fun;
  }

  private async readPDF(filePath : string) : Promise<string> {
    try {
      // Lire le fichier PDF en tant que Buffer
      const pdfBuffer = fs.readFileSync(filePath);

      // Convertir le Buffer en chaîne brute
      const pdfText = pdfBuffer.toString("latin1");

      // Chercher les textes dans le fichier PDF
      const extractedText = this.extractTextFromPDF(pdfText);

      return extractedText;
    } catch (error : any) {
      console.error(`Erreur lors de la lecture du PDF : ${error.message}`);
      return "";
    }
  }

  public extractTextFromPDF(pdfContent : string) : string {
    // Une expression régulière pour extraire du texte brut entre parenthèses
    const textRegex = /\(([^)]+)\)/g;

    let matches;
    let result = "";

    // Parcourir toutes les correspondances
    while ((matches = textRegex.exec(pdfContent)) !== null) {
      result += matches[1] + " ";
    }

    return result.trim();
  }

  private async getAllDocs() {
    let allDoc = [];
    let jsonCount = 0;
    let pdfCount = 0;

    const files = this.getFilesRecursively(this.srcPath);

    for (const file of files) {
      const filePath = path.join(file);
      if (file.endsWith(".json")) {
        let content = fs.readFileSync(filePath, { encoding: "utf8" });
        let datas = JSON.parse(content);
        const currentDoc = datas.map((data : {text : string, url : string, title : string}) => ({
          pageContent: data.text,
          metadata: {
            domain: this.orgName,
            fileName: file,
            source: data.url,
            title: data.title,
          },
        }));
        allDoc.push(...currentDoc);
        jsonCount++;
      } else if (file.endsWith(".pdf")) {
        try {
          let content = await this.readPDF(filePath);
          if (content.trim() === "") {
            // console.error(`Error reading PDF ${file}: Empty content`);
            continue;
          }
          allDoc.push({
            pageContent: content,
            metadata: {
              domain: this.orgName,
              fileName: file,
              source: filePath,
              title: path.basename(file, ".pdf"),
            },
          });
          pdfCount++;
        } catch (err : any) {
          console.error(`Error reading PDF ${file}: ${err.message}`);
        }
      }
    }
    console.log(`Read ${jsonCount} JSON files and ${pdfCount} PDF files.`);
    return allDoc;
  }

  public getFilesRecursively(dir : string) {
    let files : string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}

export default IndexDb;
