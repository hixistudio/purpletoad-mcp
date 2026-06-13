#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";
import readline from "node:readline";

const MCP_SERVER_PATH =
  process.env.PURPLETOAD_MCP_PATH ||
  "/opt/purpletoad/purpletoad-mcp/dist/index.js";

const openai = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY || "",
  baseURL:
    process.env.OPENAI_BASE_URL || "https://api.moonshot.cn/v1",
});

const MODEL = process.env.AGENT_MODEL || "kimi-latest";

async function main() {
  if (!process.env.PURPLETOAD_API_KEY) {
    console.error("Set PURPLETOAD_API_KEY to your PurpleToad API key.");
    process.exit(1);
  }
  if (!process.env.MOONSHOT_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("Set MOONSHOT_API_KEY (or OPENAI_API_KEY).");
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: [MCP_SERVER_PATH],
    env: {
      ...process.env,
      PURPLETOAD_API_KEY: process.env.PURPLETOAD_API_KEY,
      PURPLETOAD_DEFAULT_FROM: process.env.PURPLETOAD_DEFAULT_FROM || "",
    } as Record<string, string>,
  });

  const mcp = new Client(
    { name: "purpletoad-kimi-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  await mcp.connect(transport);
  console.error("Connected to PurpleToad MCP server");

  const toolsResult = await mcp.listTools();
  const tools = toolsResult.tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  }));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful email assistant. You have access to PurpleToad Mail tools. " +
        "Use them to send, read, search, and manage email. " +
        "Always confirm important actions briefly before doing them.",
    },
  ];

  try {
    while (true) {
      const input = await ask("\nYou: ");
      if (input.toLowerCase() === "exit") break;

      messages.push({ role: "user", content: input });

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages,
          tools,
          tool_choice: "auto",
        });

        const choice = completion.choices[0];
        const message = choice.message;
        messages.push(message);

        if (!message.tool_calls || message.tool_calls.length === 0) {
          console.log("\nAgent:", message.content);
          break;
        }

        for (const toolCall of message.tool_calls) {
          const name = toolCall.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            console.error(`Failed to parse arguments for ${name}`);
          }

          console.error(`\n[tool] ${name}(${JSON.stringify(args)})`);
          const toolResult = await mcp.callTool({
            name,
            arguments: args,
          });

          const resultText =
            typeof toolResult.content === "string"
              ? toolResult.content
              : JSON.stringify(toolResult.content);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultText,
          });
        }
      }
    }
  } finally {
    rl.close();
    await mcp.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
