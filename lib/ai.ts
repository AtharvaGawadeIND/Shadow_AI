import { deterministicExplanation } from "./risk";
import type { RiskLevel } from "@/types";

type ExplainInput = {
  toolName: string;
  domain: string;
  category: string;
  permissions: string[];
  riskLevel: RiskLevel;
};

export async function generateRiskExplanation(input: ExplainInput) {
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Write concise SaaS security risk summaries with why risky, data exposure, and recommendation." },
            { role: "user", content: JSON.stringify(input) }
          ],
          temperature: 0.2,
          max_tokens: 140
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? deterministicExplanation(input);
      }
    } catch {
      return deterministicExplanation(input);
    }
  }
  return deterministicExplanation(input);
}
