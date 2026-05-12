import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function categorizeIssue(description: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize this urban issue in Itapetininga, Brazil based on the description: "${description}". 
      Available categories: 'pothole', 'lighting', 'trash', 'water', 'other'. 
      Return only the category name.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ['pothole', 'lighting', 'trash', 'water', 'other'],
            },
            reason: {
              type: Type.STRING,
            }
          },
          required: ["category"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result.category as 'pothole' | 'lighting' | 'trash' | 'water' | 'other';
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return 'other';
  }
}

export async function enhanceDescription(title: string, description: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Melhore esta descrição de um problema urbano para que seja mais clara para a prefeitura. 
      Título: ${title}
      Descrição original: ${description}
      Retorne uma versão mais formal e detalhada em Português.`,
    });

    return response.text;
  } catch (error) {
    console.error("AI Enhancement failed:", error);
    return description;
  }
}
