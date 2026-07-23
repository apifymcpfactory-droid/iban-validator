# MCP Server Development Guide

This is an MCP (Model Context Protocol) server template for MCPize hosting platform.

## Project Structure

```
├── src/
│   ├── index.ts      # Main server entry point
│   ├── tools.ts       # Pure tool functions (testable)
│   ├── types.ts        # Shared TypeScript types
│   └── core/             # Synced copy of the shared ISO 13616 validation core
│       (do not hand-edit here — see ../../scripts/sync-core.mjs and ../../src/core/,
│       the canonical, fully-tested source shared with the Apify actor surface)
├── tests/
│   └── *.test.ts      # Unit tests
├── package.json       # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── mcpize.yaml          # MCPize deployment manifest
└── Dockerfile             # Container build instructions
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Run in development mode with hot reload
npm test             # Run tests with vitest
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled server
```

## MCP SDK Usage

This server uses `@modelcontextprotocol/sdk` with Streamable HTTP transport.

### Registering Tools

```typescript
server.registerTool(
  "tool-name",
  {
    title: "Human-readable title",
    description: "What this tool does",
    inputSchema: {
      param: z.string().describe("Parameter description"),
    },
    outputSchema: {
      result: z.string(),
    },
  },
  async ({ param }) => {
    const output = { result: "computed value" };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  }
);
```

## MCPize Configuration

The `mcpize.yaml` file controls deployment:

- `runtime`: Server runtime (typescript, python, php)
- `entry`: Main source file
- `build.install`: Install command
- `build.command`: Build command
- `startCommand.type`: Transport type (http)
- `configSchema.source`: Where to extract config schema from — `code` means MCPize
  reads the exported `configSchema` Zod object in `src/index.ts`. This server takes no
  configuration at all — the schema is an empty object, kept only for parity with the
  other MCP Factory servers.

## Environment Variables

- `PORT`: Server port (default: 8080, set by MCPize)

## Testing

Use MCP Inspector to test your server:

```bash
npx @anthropic-ai/mcp-inspector
```

Connect to `http://localhost:8080/mcp` to test tools and resources.

## Deployment

Deploy using MCPize CLI:

```bash
mcpize deploy
```

## Best Practices

1. **Tools vs Resources**: Use tools for actions, resources for data
2. **Error Handling**: Always handle errors gracefully in tool handlers
3. **Structured Output**: Return both `content` and `structuredContent`
4. **Descriptions**: Write clear descriptions for all tools and parameters
5. **Validation**: Use Zod schemas for input validation
6. **Environment Variables**: Use `process.env` for configuration, never hardcode secrets
