Getting Started
You can start by using our remotely hosted MCP Server at "https://mcp.serpapi.com/SERP_API_KEY/mcp" . The MCP server supports requests from any origin.

You can also self-host the MCP server locally to have full control of the deployment. You can start with it by cloning the repository and installing the dependencies:

git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp/
uv sync
Set your SerpApi API key in a ".env" file:

SERPAPI_API_KEY=SERP_API_KEY
Then start the server:

uv run src/server.py
Configure your MCP-client to connect to the server. Once connected, the AI-powered agent will detect SerpApi’s search tool and any additional resources the server provides in automation.

You can also use the provided Docker configuration to deploy the service as a container.

Interacting with the server
You can use the MCP inspector to interact and explore the MCP service. You can start by installing the package:

npm install -g  @modelcontextprotocol/inspector
Then start the inspector:

npx @modelcontextprotocol/inspector
The service will become available on localhost:6274. You can try listing the available tools, see their description and parameters.

You can also test the MCP server inside Microsoft’s VS Code IDE. You can add the MCP server config to the ".vscode/mcp.json" file and test it inside the VS Code Copilot.

{
  "servers": {
    "serpapi-mcp": {
      "type": "http",
      "url": "https://mcp.serpapi.com/<SERP_API_KEY>/mcp"
    }
  }
}
Accelerating AI Integration
By adopting the MCP standard, SerpApi makes web search a native capability for AI agents. Instead of bespoke integration code with complicated connectors, agents discover and use SerpApi’s tools automatically. This reduces hallucinations and accelerates the development of agentic applications.

SerpApi releases this server to give AI developers fast, reliable access to live search data. We’re excited to support the growing ecosystem of AI agents and provide the infrastructure that helps them understand the real world with open standards and with minimal permissions needed. The MCP server is open-source, and we invite developers to explore it, contribute, and integrate it into their own AI workflows.

Try out the SerpApi MCP server and see how it fits into your agent stack.