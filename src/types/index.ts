export interface Message {
  role: string;
  content: string;
}

export interface DatabaseResult {
  text?: string;
  [key: string]: any;
}

export interface Config {
  domain: string;
  model: string;
}