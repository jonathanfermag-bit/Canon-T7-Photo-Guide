
import { GoogleGenAI, Type } from "@google/genai";
import { CameraSettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
Você é um fotógrafo profissional especializado na câmera Canon EOS Rebel T7. 
Seu objetivo é analisar uma situação e sugerir as melhores configurações técnicas.

REGRAS DE EQUIPAMENTO:
- O usuário fornecerá uma lista de lentes que ele possui.
- Você DEVE sugerir PRIORITARIAMENTE uma das lentes da lista do usuário.
- Explique como usar a lente escolhida (ex: em qual distância focal se for uma zoom).
- Se a cena for impossível com as lentes do usuário, sugira a melhor opção dele e mencione brevemente qual lente seria a ideal "profissional".

CAPACIDADES DA T7:
- Sensor APS-C, ISO 100-6400, Obturador até 1/4000s.

Sempre retorne JSON em Português conforme o esquema.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mode: { type: Type.STRING, description: "Modo de disparo" },
    iso: { type: Type.STRING, description: "Valor de ISO" },
    aperture: { type: Type.STRING, description: "Abertura sugerida" },
    shutterSpeed: { type: Type.STRING, description: "Velocidade do obturador" },
    whiteBalance: { type: Type.STRING, description: "Balanço de branco" },
    focusMode: { type: Type.STRING, description: "Modo de foco" },
    lensSuggestion: { type: Type.STRING, description: "Qual lente do usuário usar e em que configuração" },
    tips: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Dicas específicas"
    },
    explanation: { type: Type.STRING, description: "Por que essa lente e essas configs" }
  },
  required: ["mode", "iso", "aperture", "shutterSpeed", "whiteBalance", "focusMode", "lensSuggestion", "tips", "explanation"]
};

export const analyzeScene = async (description: string, userLenses: string[], imageBase64?: string): Promise<CameraSettings> => {
  const lensesContext = userLenses.length > 0 
    ? `O usuário possui as seguintes lentes: ${userLenses.join(", ")}.` 
    : "O usuário não especificou lentes, sugira as comuns (18-55mm, 50mm).";

  const parts: any[] = [{ 
    text: `${lensesContext} Analise esta situação para a Canon T7: ${description}` 
  }];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  const text = response.text;
  if (!text) throw new Error("Sem resposta do modelo.");
  
  return JSON.parse(text) as CameraSettings;
};
