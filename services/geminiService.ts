
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

/**
 * Generates a quiz based on the provided text using Gemini AI.
 */
export const generateQuiz = async (text: string, bookTitle?: string): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limpeza de texto que preserva quebras de linha básicas (ajuda a separar ideias)
  const cleanedInput = text
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r]/g, "") // Remove caracteres de controle mas mantém acentos e quebras
    .substring(0, 30000); // Aumentado limite para abranger mais contexto

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `CONTEÚDO DO LIVRO: "${bookTitle || 'Documento PDF'}"
---
${cleanedInput}
---
TAREFA: Gere um quiz de 5 perguntas baseado EXCLUSIVAMENTE nos fatos relatados acima.`,
    config: {
      systemInstruction: `Você é um avaliador de compreensão de texto. 
Sua missão é criar um quiz que valide se o leitor realmente entendeu o conteúdo fornecido.
REGRAS:
1. NÃO use conhecimentos externos ao texto.
2. Cada pergunta deve ter 4 opções, sendo apenas uma correta.
3. Forneça uma explicação curta justificando a resposta correta com base no texto.
4. Se o texto for técnico, use termos técnicos presentes no texto.
5. Responda APENAS com o JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"],
        }
      }
    }
  });

  const textOutput = response.text;
  if (!textOutput) throw new Error("A API Gemini não retornou conteúdo.");

  return JSON.parse(textOutput.trim());
};
