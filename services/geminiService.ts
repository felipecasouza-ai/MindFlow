
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

/**
 * Generates a quiz based on the provided text using Gemini AI.
 * Adheres to the latest @google/genai SDK guidelines.
 */
export const generateQuiz = async (text: string): Promise<QuizQuestion[]> => {
  // Always initialize GoogleGenAI with a named parameter using process.env.API_KEY directly.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Basic input cleaning to remove control characters and limit length
  const cleanedInput = text.replace(/[\x00-\x1F\x7F-\x9F]/g, "").substring(0, 15000);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Gere um quiz de múltipla escolha com 5 perguntas em Português baseado no texto abaixo. 
Responda EXCLUSIVAMENTE em formato JSON.

TEXTO:
${cleanedInput}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { 
              type: Type.STRING,
              description: 'The quiz question.'
            },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'The possible answers.'
            },
            correctAnswer: { 
              type: Type.INTEGER,
              description: 'The index of the correct answer.'
            },
            explanation: { 
              type: Type.STRING,
              description: 'Explanation for why the answer is correct.'
            }
          },
          required: ["question", "options", "correctAnswer", "explanation"],
        }
      }
    }
  });

  // Handle potentially undefined text property as per TypeScript error TS18048
  const textOutput = response.text;
  if (!textOutput) {
    throw new Error("A API Gemini não retornou conteúdo de texto válido.");
  }

  const jsonStr = textOutput.trim();
  return JSON.parse(jsonStr);
};
