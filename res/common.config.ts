interface CommonConfig {
  maxPagesToCrawl: number;
  maxFileSize: number;
  maxTokens: number;
  jsonOutputDir: string;
  pdfOutputDir: string;
  model: string;
}

export interface ConfigType extends CommonConfig {
  url: string;
  domain: string;
  exclude?: string[];
  matchers?: string[];
  ukSelector?: string;
  selector?: {
    property: string;
    selector: string;
    number: "unique" | "array";
    where: "children" | "attribute";
  }[];
}

const commonConfig: CommonConfig = {
  maxPagesToCrawl: 10,
  maxFileSize: 1000, // Taille max en Ko
  maxTokens: 50, // Nombre max d'unités par fichier
  jsonOutputDir: "json",
  pdfOutputDir: "pdf",
  model: "llama3.2:3b", // Configuration pour le modèle
};

export default commonConfig;
