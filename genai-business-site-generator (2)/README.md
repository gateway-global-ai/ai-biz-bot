# GenAI Business Site Generator - Integration Guide

## Overview

This directory contains the **GenAI Business Site Generator** - a standalone AI-powered website builder for small businesses. It integrates with the main chat-mvp platform through Google Places API and Google Workspace MCP server.

**Original Source:** Exported from Google AI Studio (see [README_ORIGINAL.md](./README_ORIGINAL.md))

## 🔗 Connected to Main Platform

This generator is part of a larger ecosystem. See the complete integration documentation:

- **[GOOGLE_BUSINESS_QUICKSTART.md](../GOOGLE_BUSINESS_QUICKSTART.md)** - For business owners
- **[GOOGLE_BUSINESS_MCP_INTEGRATION.md](../GOOGLE_BUSINESS_MCP_INTEGRATION.md)** - For developers
- **[Google Business Notes/](../Google%20Business%20Notes/)** - API knowledge base

## 🚀 Quick Start

```bash
# From this directory
npm install

# Set your Gemini API key
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
# Note: The code uses API_KEY internally, but GEMINI_API_KEY is the standard naming

# Run the app
npm run dev
```

## 🎯 Key Features

1. **Business Discovery** - Google Places API search
2. **AI Content Generation** - Gemini 2.5 Flash
3. **Voice AI Assistant** - Real-time voice interactions
4. **Admin Panel** - Business management & integrations

## 📚 Full Documentation

See [GOOGLE_BUSINESS_MCP_INTEGRATION.md](../GOOGLE_BUSINESS_MCP_INTEGRATION.md) for:
- Complete architecture
- Integration patterns
- API usage examples
- Business use cases

---

**Part of:** Gateway Global AI - Chat MVP  
**Last Updated:** February 7, 2026
