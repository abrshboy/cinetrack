import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SearchResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const searchMediaWithGemini = async (query: string): Promise<SearchResult[]> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return [];
  }

  try {
    const model = ai.models;
    
    const searchSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['movie', 'series'] },
          year: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['title', 'type', 'year', 'description'],
        propertyOrdering: ['title', 'type', 'year', 'description']
      }
    };

    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for popular movies or TV series matching the query: "${query}". 
      Return a list of up to 6 results with their titles, whether they are a 'movie' or 'series', 
      release year, and a very short description (under 15 words).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: searchSchema,
        temperature: 0.3,
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const results = JSON.parse(text) as SearchResult[];
    return results;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};
