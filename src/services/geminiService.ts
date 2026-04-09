import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  allocation: number;
  thesis: string;
  expectedDrift: number;
  expectedVolatility: number;
}

export interface PortfolioResponse {
  stocks: StockRecommendation[];
  summary: string;
}

export interface StockEntryAnalysis {
  ticker: string;
  valuation: string;
  priceAction: string;
  supportLevels: string[];
  recommendation: "Buy Now" | "Wait for Pullback" | "Target Entry";
  targetPrice?: number;
  thesis: string;
}

export async function analyzeStockEntry(ticker: string): Promise<StockEntryAnalysis> {
  const prompt = `Analyze the stock entry for ticker: ${ticker}. 
  Provide:
  1. Current valuation analysis.
  2. Recent price action analysis.
  3. Key support levels (at least 2).
  4. A clear recommendation: "Buy Now", "Wait for Pullback", or "Target Entry".
  5. If "Target Entry", specify a target entry price.
  6. A brief thesis behind the recommendation.`;

  const response = await getAiClient().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          valuation: { type: Type.STRING },
          priceAction: { type: Type.STRING },
          supportLevels: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          recommendation: {
            type: Type.STRING,
            enum: ["Buy Now", "Wait for Pullback", "Target Entry"],
          },
          targetPrice: { type: Type.NUMBER },
          thesis: { type: Type.STRING },
        },
        required: ["ticker", "valuation", "priceAction", "supportLevels", "recommendation", "thesis"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to analyze stock entry");
  }

  return JSON.parse(response.text.trim());
}

export async function generatePortfolio(
  budget: number,
  strategy: string,
  horizon: string,
  numStocks: number = 5
): Promise<PortfolioResponse> {
  const prompt = `Build a diversified portfolio of ${numStocks} stocks for an investment of $${budget}. 
  Strategy: ${strategy}
  Horizon: ${horizon}
  
  For each stock, provide:
  1. Symbol and Name
  2. Allocation percentage (summing to 100%)
  3. Investment thesis
  4. Estimated annual drift (as a decimal, e.g., 0.08 for 8%)
  5. Estimated annual volatility (as a decimal, e.g., 0.15 for 15%)
  
  Also provide a brief summary of the overall strategy.`;

  const response = await getAiClient().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                name: { type: Type.STRING },
                allocation: { type: Type.NUMBER },
                thesis: { type: Type.STRING },
                expectedDrift: { type: Type.NUMBER },
                expectedVolatility: { type: Type.NUMBER },
              },
              required: ["symbol", "name", "allocation", "thesis", "expectedDrift", "expectedVolatility"],
            },
          },
          summary: { type: Type.STRING },
        },
        required: ["stocks", "summary"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate portfolio recommendation");
  }

  return JSON.parse(response.text.trim());
}
