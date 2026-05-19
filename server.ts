import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily
let defaultAi: GoogleGenAI | null = null;

function getDefaultAi() {
  if (!defaultAi) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    defaultAi = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return defaultAi;
}

// Helper to get Gemini client based on user
async function getGeminiClient(req: express.Request) {
  const userApiKey = req.headers['x-gemini-api-key'];

  if (userApiKey && typeof userApiKey === 'string') {
    return new GoogleGenAI({ 
      apiKey: userApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  
  return getDefaultAi();
}

// Helper function for handling Gemini errors
const handleGeminiError = (error: any, res: any) => {
  // Detailed logging for debugging
  console.error("Gemini API Error Detail:", {
    name: error?.name,
    message: error?.message,
    status: error?.status,
    code: error?.code,
    errorResponse: error?.error
  });
  
  const errStr = JSON.stringify(error).toLowerCase();
  const msgStr = (error?.message || "").toLowerCase();
  
  // Detect Quota/Rate Limit
  if (
    error?.status === 429 || 
    error?.code === 429 || 
    errStr.includes("resource_exhausted") || 
    errStr.includes("quota") ||
    msgStr.includes("limit")
  ) {
    return res.status(429).json({ 
      error: "Límite de mensajes alcanzado. Por favor, espera 60 segundos antes de intentar de nuevo." 
    });
  }
  
  // Detect Overloaded/Internal/503
  if (
    error?.status === 503 || 
    errStr.includes("overloaded") || 
    errStr.includes("unavailable") ||
    errStr.includes("high demand")
  ) {
    return res.status(503).json({ 
      error: "El servicio de IA está saturado en este momento. Reintenta en unos segundos." 
    });
  }

  res.status(500).json({ error: "La IA está experimentando mucha actividad o un error temporal. Por favor, reintenta." });
};

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, grade, subject } = req.body;
    const ai = await getGeminiClient(req);
    
    const contents = history ? [...history, { role: "user", parts: [{ text: message }] }] : [{ role: "user", parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: `Eres un tutor experto para estudiantes de ${grade}. Tu objetivo es ayudar con la materia de ${subject}. Explica de forma clara, usa ejemplos y fomenta el pensamiento crítico. No des solo la respuesta, guía al estudiante. 
        IMPORTANTE: Para cualquier expresión matemática, fórmula o cálculo, utiliza SIEMPRE el formato LaTeX. 
        - Usa $...$ para expresiones dentro de una línea de texto.
        - Usa $$...$$ para fórmulas en líneas separadas.
        Ejemplo: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$`,
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
      model: "gemini-2.5-flash",
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
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
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
      model: "gemini-2.5-flash",
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
            progressScore: { type: Type.NUMBER }
          },
          required: ["strengths", "improvements", "recommendations", "progressScore"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    handleGeminiError(error, res);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless — Vercel imports this as the handler
export default app;

// Only bind to a port when running locally
if (!process.env.VERCEL) {
  startServer();
}
