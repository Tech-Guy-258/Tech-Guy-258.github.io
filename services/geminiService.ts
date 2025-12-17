import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InventoryItem, Category, Unit, RecipeSuggestion } from "../types";

// Initialize Gemini Client
// IMPORTANT: The API key is assumed to be available in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image of a grocery product to extract details.
 */
export const analyzeProductImage = async (base64Image: string): Promise<Partial<InventoryItem> | null> => {
  try {
    const prompt = `Analise esta imagem de um produto de mercearia. 
    Identifique o nome do produto, a categoria mais provável, a unidade de medida e o TAMANHO/PESO LÍQUIDO da embalagem (ex: se for um saco de arroz de 5kg, o tamanho é 5).
    Responda APENAS com um objeto JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity from camera/upload
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING, enum: Object.values(Category) },
            unit: { type: Type.STRING, enum: Object.values(Unit) },
            size: { type: Type.NUMBER, description: "Net weight or volume number (e.g. 1, 5, 25)" },
            estimatedPrice: { type: Type.NUMBER, description: "Estimated price in Mozambican Meticais (MZN)" }
          },
          required: ["name", "category", "unit"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
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
      .map(item => `${item.name} (${item.quantity} x ${item.size}${item.unit}, expira em ${item.expiryDate})`)
      .join(', ');

    const prompt = `Eu tenho os seguintes ingredientes na minha mercearia: ${ingredientsList}.
    Sugere 3 receitas criativas que eu possa fazer utilizando principalmente estes ingredientes, 
    dando prioridade aos que expiram em breve.
    A resposta deve ser em Português de Portugal.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
      return JSON.parse(response.text);
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
      Estás a agir como um assistente de gestão de uma mercearia em Moçambique.
      O inventário atual é:
      ${JSON.stringify(contextItems.map(i => ({ name: i.name, qty: i.quantity, size: i.size, unit: i.unit, expiry: i.expiryDate })))}
      
      Responde a perguntas sobre o stock, ideias de vendas, ou gestão.
      Mantém as respostas curtas e úteis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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