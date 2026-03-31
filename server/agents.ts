import { GoogleGenAI, Type } from "@google/genai";
import { AgentRole, TriageSchema, PlanningSchema, ReviewSchema } from "../src/types";
import { callMinimax } from "./minimax";

// Provider selection: "minimax" | "gemini"
const AI_PROVIDER = process.env.AI_PROVIDER || "minimax";

const SYSTEM_PROMPTS: Record<AgentRole, string> = {
  [AgentRole.TAIZI]: `You are the Crown Prince (Taizi). Your role is Intent Extraction & Triage. 
  Analyze the Emperor's (User) request and extract structured data.
  If the request is ambiguous, list the ambiguities.
  Output MUST be JSON matching the TriageSchema.`,
  
  [AgentRole.ZHONGSHU]: `You are the Zhongshu Province. Your role is Strategic Planning & Task Decomposition.
  Create a detailed plan (DAG) to execute the Emperor's decree.
  Break the task into subtasks for the Six Ministries.
  Output MUST be JSON matching the PlanningSchema.`,
  
  [AgentRole.MENXIA]: `You are the Menxia Province. Your role is Quality Control & Veto.
  Review the plan from Zhongshu. Check for safety, feasibility, and alignment with the Emperor's goal.
  You have Veto power. If you veto, provide specific violation codes and required actions.
  Output MUST be JSON matching the ReviewSchema.`,
  
  [AgentRole.SHANGSHU]: `You are the Shangshu Province. Your role is Task Dispatch & Orchestration.
  You coordinate the Six Ministries.`,
  
  [AgentRole.HUBU]: `You are the Ministry of Revenue (Hubu). You handle Data, Resources, and Finance.`,
  [AgentRole.LIBU]: `You are the Ministry of Rites/Personnel (Libu). You handle Documentation, Standards, and API specs.`,
  [AgentRole.BINGBU]: `You are the Ministry of War (Bingbu). You handle Engineering, Code, and Algorithms.`,
  [AgentRole.XINGBU]: `You are the Ministry of Justice (Xingbu). You handle Security, Compliance, and Auditing.`,
  [AgentRole.GONGBU]: `You are the Ministry of Works (Gongbu). You handle Infrastructure, DevOps, and CI/CD.`,
  [AgentRole.LIBU_HR]: `You are Libu_HR. You manage Agent identities and permissions.`,
  [AgentRole.ZAOCHAO]: `You are Zaochao. You handle scheduled tasks and briefings.`,
  [AgentRole.EMPEROR]: `The User.`
};

export async function callAgent(role: AgentRole, prompt: string, schema?: any) {
  const systemPrompt = SYSTEM_PROMPTS[role];

  if (AI_PROVIDER === "minimax") {
    const result = await callMinimax(systemPrompt, prompt, !!schema);
    if (schema) {
      try {
        return JSON.parse(result);
      } catch (e) {
        console.error(`Failed to parse agent response as JSON: ${result}`);
        throw new Error("Agent returned invalid JSON");
      }
    }
    return result;
  }

  // Gemini fallback
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const model = "gemini-3-flash-preview";
  
  const config: any = {
    systemInstruction: systemPrompt,
  };

  if (schema) {
    config.responseMimeType = "application/json";
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config
  });

  const text = response.text;
  if (schema) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`Failed to parse agent response as JSON: ${text}`);
      throw new Error("Agent returned invalid JSON");
    }
  }
  return text;
}
