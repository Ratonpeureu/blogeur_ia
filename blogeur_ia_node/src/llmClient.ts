import Anthropic from "@anthropic-ai/sdk";
import { settings } from "./config";

const client = new Anthropic({ apiKey: settings.llmApiKey });

function extraireJson(texte: string): any {
  const nettoye = texte.trim().replace(/^```json\s*|\s*```$/gm, "");
  return JSON.parse(nettoye);
}

export class LLMClient {
  async chat(userMessage: string, systemPrompt = "", temperature = 0.7): Promise<string> {
    const resp = await client.messages.create({
      model: settings.llmModel,
      max_tokens: 4096,
      system: systemPrompt,
      temperature,
      messages: [{ role: "user", content: userMessage }],
    });
    return resp.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  async chatJson(userMessage: string, systemPrompt = "", temperature = 0.7): Promise<any> {
    const texte = await this.chat(
      userMessage + "\n\nRéponds UNIQUEMENT en JSON strict, sans texte autour.",
      systemPrompt,
      temperature
    );
    try {
      return extraireJson(texte);
    } catch {
      const corrige = await this.chat(
        `Le texte suivant devait être du JSON strict mais ne l'est pas. Renvoie UNIQUEMENT le JSON corrigé, rien d'autre :\n${texte}`,
        systemPrompt,
        0.2
      );
      return extraireJson(corrige);
    }
  }
}