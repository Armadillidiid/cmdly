import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const GITHUB_API_KEY = process.env.GITHUB_TOKEN;

export const githubProvider = createOpenAICompatible({
  name: "github",
  apiKey: GITHUB_API_KEY || "",
  baseURL: "https://models.github.ai/inference",
});
