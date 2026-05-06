import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";
import {
  buildExpansionMessages,
  buildStructuredMessages,
  buildInterpretationMessages,
  buildTitleMessages,
} from "./src/llm-prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function resolveProviderConfig() {
  const explicitProvider = process.env.DREAM_LLM_PROVIDER;
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY;

  const provider = explicitProvider || (kimiKey ? "kimi" : groqKey ? "groq" : openRouterKey ? "openrouter" : "kimi");

  if (provider === "openrouter") {
    return {
      provider,
      apiKey: openRouterKey,
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
      extraHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || `http://localhost:${PORT}`,
        "X-Title": process.env.OPENROUTER_APP_NAME || "Dream App MVP",
      },
    };
  }

  if (provider === "kimi") {
    return {
      provider: "kimi",
      apiKey: kimiKey,
      baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
      model: process.env.KIMI_MODEL || "moonshot-v1-8k",
      extraHeaders: {},
    };
  }

  return {
    provider: "groq",
    apiKey: groqKey,
    baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    extraHeaders: {},
  };
}

async function readRequestBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}

async function requestModelCompletion({ stage, session, latestUserMessage, continuation }) {
  const config = resolveProviderConfig();
  if (!config.apiKey) {
    throw new Error(
      config.provider === "groq"
        ? "Missing GROQ_API_KEY. Set it before starting the server."
        : config.provider === "openrouter"
        ? "Missing OPENROUTER_API_KEY. Set it before starting the server."
        : "Missing KIMI_API_KEY. Set it before starting the server.",
    );
  }

  const messages =
    stage === "struct"
      ? buildStructuredMessages({ session })
      : stage === "interpret"
      ? buildInterpretationMessages({ session })
      : stage === "title"
      ? buildTitleMessages({ session })
      : buildExpansionMessages({ session, latestUserMessage, continuation });

  const maxTokens =
    stage === "struct"
      ? 220
      : stage === "interpret"
      ? 500
      : stage === "title"
      ? 100
      : 120;

  const temperature =
    stage === "struct"
      ? 0.35
      : stage === "interpret"
      ? 0.7
      : stage === "title"
      ? 0.6
      : 0.8;

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason =
      payload?.error?.message || payload?.message || `Model request failed with status ${response.status}.`;
    throw new Error(reason);
  }

  return {
    content: payload?.choices?.[0]?.message?.content?.trim() || "",
    provider: config.provider,
    model: config.model,
  };
}

async function serveStatic(request, response) {
  const requestPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.join(__dirname, decodeURIComponent(requestPath.split("?")[0]));

  if (!filePath.startsWith(__dirname)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    const targetPath = fileStat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const ext = path.extname(targetPath);
    const content = await readFile(targetPath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/dream-chat") {
    try {
      const body = await readRequestBody(request);
      const result = await requestModelCompletion(body);
      json(response, 200, result);
    } catch (error) {
      json(response, 500, {
        error: error instanceof Error ? error.message : "Unknown model error.",
      });
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/llm-config") {
    const config = resolveProviderConfig();
    json(response, 200, {
      provider: config.provider,
      model: config.model,
      configured: Boolean(config.apiKey),
    });
    return;
  }

  serveStatic(request, response);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Dream App MVP running at http://localhost:${PORT}`);
});
