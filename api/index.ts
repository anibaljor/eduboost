import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let defaultAi: GoogleGenAI | null = null;

function getDefaultAi() {
  if (!defaultAi) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("NO_API_KEY");
    defaultAi = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  }
  return defaultAi;
}

async function getGeminiClient(req: express.Request) {
  const userApiKey = req.headers["x-gemini-api-key"];
  if (userApiKey && typeof userApiKey === "string") {
    return new GoogleGenAI({ apiKey: userApiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  }
  return getDefaultAi();
}

const handleGeminiError = (error: any, res: express.Response) => {
  console.error("Gemini API Error:", { name: error?.name, message: error?.message, status: error?.status });

  const errStr = JSON.stringify(error).toLowerCase();
  const msgStr = (error?.message || "").toLowerCase();

  if (msgStr.includes("no_api_key")) {
    return res.status(401).json({ error: "No hay una API key de Gemini configurada. Agregá tu clave en Ajustes." });
  }
  if (error?.status === 401 || errStr.includes("api_key_invalid") || errStr.includes("invalid api key") || errStr.includes("api key not valid")) {
    return res.status(401).json({ error: "La API key de Gemini es inválida. Verificá que sea correcta en Ajustes." });
  }
  if (error?.status === 429 || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
    return res.status(429).json({ error: "Límite de mensajes alcanzado. Por favor, espera 60 segundos antes de intentar de nuevo." });
  }
  if (error?.status === 503 || errStr.includes("overloaded") || errStr.includes("unavailable")) {
    return res.status(503).json({ error: "El servicio de IA está saturado en este momento. Reintenta en unos segundos." });
  }

  res.status(500).json({ error: "La IA está experimentando mucha actividad o un error temporal. Por favor, reintenta." });
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, grade, subject } = req.body;
    const ai = await getGeminiClient(req);
    const contents = history
      ? [...history, { role: "user", parts: [{ text: message }] }]
      : [{ role: "user", parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: `Eres un tutor experto para estudiantes de ${grade}. Tu objetivo es ayudar con la materia de ${subject}. Explica de forma clara, usa ejemplos y fomenta el pensamiento crítico. No des solo la respuesta, guía al estudiante.
        IMPORTANTE: Para cualquier expresión matemática, fórmula o cálculo, utiliza SIEMPRE el formato LaTeX.
        - Usa $...$ para expresiones dentro de una línea de texto.
        - Usa $$...$$ para fórmulas en líneas separadas.
        Ejemplo: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$`,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    handleGeminiError(error, res);
  }
});

app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { topic, difficulty, questionCount, grade } = req.body;
    const ai = await getGeminiClient(req);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Genera un quiz de ${topic} para un estudiante de ${grade}. Dificultad: ${difficulty}. Cantidad de preguntas: ${questionCount}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctAnswer", "explanation"],
              },
            },
          },
          required: ["title", "questions"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    handleGeminiError(error, res);
  }
});

app.post("/api/analyze-progress", async (req, res) => {
  try {
    const { history, grades } = req.body;
    const ai = await getGeminiClient(req);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Analiza el progreso del estudiante basado en este historial de consultas: ${JSON.stringify(history)} y estas calificaciones: ${JSON.stringify(grades)}.
      Genera un reporte resumido con:
      1. Fortalezas.
      2. Áreas de mejora.
      3. Recomendaciones de estudio.
      4. Un puntaje estimado de progreso (0-100).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            progressScore: { type: Type.NUMBER },
          },
          required: ["strengths", "improvements", "recommendations", "progressScore"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    handleGeminiError(error, res);
  }
});

export default app;
