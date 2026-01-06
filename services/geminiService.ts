
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Category, Unit, RecipeSuggestion } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image of a grocery product to extract details.
 */
export const analyzeProductImage = async (base64Image: string): Promise<Partial<InventoryItem> | null> => {
  try {
    // Fixed: Prompt updated to include the schema since native schema config is not supported for gemini-2.5-flash-image
    const prompt = `Analise esta imagem de um produto de mercearia. 
    Identifique o nome do produto, a categoria mais provável, a unidade de medida e o TAMANHO/PESO LÍQUIDO da embalagem.
    Responda APENAS com um objeto JSON válido seguindo este formato:
    {
      "name": "string",
      "category": "string (deve ser um dos: ${Object.values(Category).join(', ')})",
      "unit": "string (deve ser um dos: ${Object.values(Unit).join(', ')})",
      "size": number,
      "price": number (preço de custo estimado em MZN)
    }`;

    // Fixed: Removed responseMimeType and responseSchema as they are not supported for nano banana series models (like gemini-2.5-flash-image)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Error analyzing product image:", error);
    return null;
  }
};

/**
 * Suggests recipes based on available inventory items.
 */
export const suggestRecipes = async (items: InventoryItem[]): Promise<RecipeSuggestion[]> => {
  try {
    const ingredientsList = items
      .filter(i => i.quantity > 0)
      .map(item => `${item.name} (${item.quantity} ${item.unit})`)
      .join(', ');

    const prompt = `Eu tenho estes ingredientes: ${ingredientsList}.
    Sugere 3 receitas criativas utilizando principalmente estes ingredientes.
    Priorize os que expiram em breve. Responda em Português de Portugal.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['Fácil', 'Médio', 'Difícil'] },
              time: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return [];
  } catch (error) {
    console.error("Error suggesting recipes:", error);
    return [];
  }
};

/**
 * Chat with the AI regarding inventory management.
 */
export const chatWithInventoryAssistant = async (message: string, contextItems: InventoryItem[]) => {
  try {
    const context = `
      Estás a agir como um assistente de gestão profissional de uma loja em Moçambique.
      Inventário atual: ${JSON.stringify(contextItems.map(i => ({ n: i.name, q: i.quantity, u: i.unit })))}
      Responda de forma curta, prática e útil em Português.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: context
      }
    });

    return response.text || "Desculpe, não consegui processar o pedido.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Ocorreu um erro ao comunicar com a IA.";
  }
};
