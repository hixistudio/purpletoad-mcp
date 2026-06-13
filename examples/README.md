# PurpleToad MCP Examples

## Kimi / OpenAI-compatible agent

`kimi-agent.ts` shows how to connect a local AI agent to the PurpleToad MCP server and let it use your email tools.

It works with any OpenAI-compatible API, including **Kimi** (`api.moonshot.cn`), OpenAI, and local models via Ollama/vLLM.

### 1. Install dependencies

```bash
cd examples
npm install
```

### 2. Set environment variables

```bash
export PURPLETOAD_API_KEY="pt_live_your_key_here"
export PURPLETOAD_DEFAULT_FROM="agent@yourdomain.com"
export MOONSHOT_API_KEY="your-kimi-key"
# Optional: point to local MCP server path if different
export PURPLETOAD_MCP_PATH="/opt/purpletoad/purpletoad-mcp/dist/index.js"
```

### 3. Run

```bash
npx tsx kimi-agent.ts
```

Then type things like:

- "Send a welcome email from hello@mydomain.com to john@example.com"
- "Do I have any unread emails in support@mydomain.com?"
- "Add mycompany.com to PurpleToad Mail"

Type `exit` to quit.
