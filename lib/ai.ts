import { generateRiskExplanation as explainWithRiskEngine } from "./risk";
import type { RiskLevel } from "@/types";

type ExplainInput = {
  toolName: string;
  domain: string;
  category: string;
  permissions: string[];
  riskLevel: RiskLevel;
};

export async function generateRiskExplanation(input: ExplainInput) {
  return explainWithRiskEngine(input);
}
