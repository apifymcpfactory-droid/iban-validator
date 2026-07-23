import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import chalk from "chalk";
import { bulkCheckIban, checkSingleIban, MAX_BULK_SIZE } from "./tools.js";

// ============================================================================
// Config (configSchema.source: code — MCPize derives the optional config form
// below). This server takes no configuration at all; the schema is empty and
// kept only for parity with the other MCP Factory servers.
// ============================================================================

export const configSchema = z.object({});

// ============================================================================
// Dev Logging Utilities
// ============================================================================

const isDev = process.env.NODE_ENV !== "production";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function formatLatency(ms: number): string {
  if (ms < 100) return chalk.green(`${ms}ms`);
  if (ms < 500) return chalk.yellow(`${ms}ms`);
  return chalk.red(`${ms}ms`);
}

function truncate(str: string, maxLen = 60): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

function logRequest(method: string, params?: unknown): void {
  if (!isDev) return;

  const paramsStr = params ? chalk.gray(` ${truncate(JSON.stringify(params))}`) : "";
  console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.cyan("→")} ${method}${paramsStr}`);
}

function logResponse(method: string, result: unknown, latencyMs: number): void {
  if (!isDev) return;

  const latency = formatLatency(latencyMs);

  // For tool calls, show the result
  if (method === "tools/call" && result) {
    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
    console.log(
      `${chalk.gray(`[${timestamp()}]`)} ${chalk.green("←")} ${truncate(resultStr)} ${chalk.gray(`(${latency})`)}`
    );
  } else {
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.green("✓")} ${method} ${chalk.gray(`(${latency})`)}`);
  }
}

function logError(method: string, error: unknown, latencyMs: number): void {
  const latency = formatLatency(latencyMs);

  let errorMsg: string;
  if (error instanceof Error) {
    errorMsg = error.message;
  } else if (typeof error === "object" && error !== null) {
    // JSON-RPC error object has { code, message, data? }
    const rpcError = error as { message?: string; code?: number };
    errorMsg = rpcError.message || `Error ${rpcError.code || "unknown"}`;
  } else {
    errorMsg = String(error);
  }

  console.log(
    `${chalk.gray(`[${timestamp()}]`)} ${chalk.red("✖")} ${method} ${chalk.red(truncate(errorMsg))} ${chalk.gray(`(${latency})`)}`
  );
}

// ============================================================================
// MCP Server Setup
// ============================================================================

// Build a FRESH MCP server per request.
//
// In stateless streamable-HTTP mode the MCP SDK allows a Server to be connected
// to exactly ONE transport. Reusing a single module-scope instance throws
// "Already connected to a transport" on the second connection — and Cloud Run
// opens several (startup probe + real requests). So always create a new server
// (and a new transport) inside the request handler below.
const STATUS_VALUES = ["VALID", "INVALID_CHECKSUM", "INVALID_STRUCTURE", "INVALID_LENGTH", "INVALID_COUNTRY", "INVALID_INPUT"] as const;
const STATUS_DESCRIPTION =
  "VALID means every check passed: recognized country, correct length, correct BBAN structure, and a passing mod-97 " +
  "checksum. INVALID_CHECKSUM means the shape is right but the check digits don't add up (likely a typo). " +
  "INVALID_STRUCTURE means the BBAN doesn't match this country's pattern. INVALID_LENGTH means the IBAN is the " +
  "wrong length for its country. INVALID_COUNTRY means the 2-letter prefix isn't a recognized IBAN country. " +
  "INVALID_INPUT means it wasn't parseable at all (empty, non-alphanumeric, or too short). Never treat any " +
  "non-VALID status as identical — each names a different fix.";

const ibanResultSchema = z.object({
  input: z.string().describe("The IBAN exactly as it was submitted."),
  valid: z.boolean().describe("True only when status is VALID."),
  countryCode: z.string().nullable().describe("2-letter country code. Null only for INVALID_INPUT."),
  checkDigits: z.string().nullable().describe("The 2-digit check-digit substring as submitted. Null only for INVALID_INPUT."),
  structureValid: z.boolean().describe("Whether the BBAN matches this country's official structure — independent of checkDigitsValid."),
  checkDigitsValid: z.boolean().describe("Whether the mod-97 checksum passes — computed independently of structureValid."),
  sepaCountry: z.boolean().describe("True when the country is one of the 36 official SEPA scheme participants."),
  electronicFormat: z.string().nullable().describe("Normalized, no-spaces, uppercase form. Null only for INVALID_INPUT."),
  printFormat: z.string().nullable().describe("Human-readable form grouped in blocks of 4. Null only for INVALID_INPUT."),
  status: z.enum(STATUS_VALUES).describe(STATUS_DESCRIPTION),
});

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "iban-validator",
    version: "1.0.0",
  });

  server.registerTool(
    "validate_iban",
    {
      title: "Validate an IBAN",
      description:
        "Validate one IBAN entirely offline against the ISO 13616 mod-97 checksum and its country's official BBAN " +
        "structure — no bank API, no data leaves this call. Validation only: does not look up the bank name, BIC, " +
        'or confirm the account exists. Example: { "iban": "GB29NWBK60161331926819" }.',
      inputSchema: {
        iban: z
          .string()
          .min(1)
          .describe('An IBAN in any casing, with or without spaces, e.g. "GB29NWBK60161331926819" or "gb29 nwbk 6016 1331 9268 19".'),
      },
      outputSchema: ibanResultSchema.shape,
    },
    async ({ iban }) => {
      const output = checkSingleIban(iban);
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    "bulk_check_iban",
    {
      title: "Bulk Validate IBANs",
      description:
        `Validate up to ${MAX_BULK_SIZE} IBANs in one call — offline, deterministic, no network. Returns one typed ` +
        "result per IBAN, in order, plus a status-count summary. A single bad entry never fails the batch. " +
        'Example: { "ibans": ["GB29NWBK60161331926819", "DE89370400440532013000"] }.',
      inputSchema: {
        ibans: z
          .array(z.string())
          .min(1)
          .max(MAX_BULK_SIZE)
          .describe(`1-${MAX_BULK_SIZE} IBANs to validate, in any casing and with or without spaces.`),
      },
      outputSchema: {
        results: z.array(ibanResultSchema).describe("One entry per requested IBAN, in the same order."),
        summary: z.object({
          total: z.number().int(),
          valid: z.number().int(),
          invalid_checksum: z.number().int(),
          invalid_structure: z.number().int(),
          invalid_length: z.number().int(),
          invalid_country: z.number().int(),
          invalid_input: z.number().int(),
        }),
      },
    },
    async ({ ibans }) => {
      const output = bulkCheckIban(ibans);
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  return server;
}

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();
app.use(express.json());

// Health check endpoint (required for Cloud Run)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

// MCP endpoint with dev logging
app.post("/mcp", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const body = req.body;

  // Extract method and params from JSON-RPC request
  const method = body?.method || "unknown";
  const params = body?.params;

  // Log incoming request
  if (method === "tools/call") {
    const toolName = params?.name || "unknown";
    const toolArgs = params?.arguments;
    logRequest(`tools/call ${chalk.bold(toolName)}`, toolArgs);
  } else if (method !== "notifications/initialized") {
    logRequest(method, params);
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Capture response body for logging
  let responseBody = "";
  const originalWrite = res.write.bind(res) as typeof res.write;
  const originalEnd = res.end.bind(res) as typeof res.end;

  res.write = function (chunk: unknown, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void) {
    if (chunk) {
      responseBody += typeof chunk === "string" ? chunk : Buffer.from(chunk as ArrayBuffer).toString();
    }
    return originalWrite(chunk as string, encodingOrCallback as BufferEncoding, callback);
  };

  res.end = function (chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) {
    if (chunk) {
      responseBody += typeof chunk === "string" ? chunk : Buffer.from(chunk as ArrayBuffer).toString();
    }

    // Log response
    if (method !== "notifications/initialized") {
      const latency = Date.now() - startTime;

      try {
        const rpcResponse = JSON.parse(responseBody) as { result?: unknown; error?: unknown };

        if (rpcResponse?.error) {
          logError(method, rpcResponse.error, latency);
        } else if (method === "tools/call") {
          const content = (rpcResponse?.result as { content?: Array<{ text?: string }> })?.content;
          const resultText = content?.[0]?.text;
          logResponse(method, resultText, latency);
        } else {
          logResponse(method, null, latency);
        }
      } catch {
        logResponse(method, null, latency);
      }
    }

    return originalEnd(chunk as string, encodingOrCallback as BufferEncoding, callback);
  };

  res.on("close", () => {
    transport.close();
  });

  // Fresh server instance per request (see createMcpServer above) — required for
  // stateless streamable-HTTP so a second connection never reuses a transport.
  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// JSON error handler (Express defaults to HTML errors)
app.use((_err: unknown, _req: Request, res: Response, _next: Function) => {
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(process.env.PORT || "8080");
const httpServer = app.listen(port, () => {
  console.log();
  console.log(chalk.bold("MCP Server running on"), chalk.cyan(`http://localhost:${port}`));
  console.log(`  ${chalk.gray("Health:")} http://localhost:${port}/health`);
  console.log(`  ${chalk.gray("MCP:")}    http://localhost:${port}/mcp`);

  if (isDev) {
    console.log();
    console.log(chalk.gray("─".repeat(50)));
    console.log();
  }
});

// Graceful shutdown for Cloud Run (SIGTERM before kill)
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  httpServer.close(() => {
    process.exit(0);
  });
});
