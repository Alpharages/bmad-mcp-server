# BMAD MCP Server Documentation

**Version:** 4.0.0  
**Last Updated:** November 6, 2025

Welcome to the BMAD MCP Server documentation - bringing the power of the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) to AI assistants through the Model Context Protocol.

---

## Essential Documentation

### � [README.md](../README.md)

**Start here** - Project overview, installation, quick start, and usage guide.

### 🏗️ [Architecture](./architecture.md)

System architecture, components, design principles, and data flow.

Includes the [ClickUp Adapter Layer](./architecture.md#clickup-adapter-layer) design.

### 🔌 [API Contracts](./api-contracts.md)

MCP tools API, resources, prompts, completions, and TypeScript APIs.

Includes the [ClickUp Tools reference](./api-contracts.md#clickup-tools) with per-tool schemas and modes.

### � [Development Guide](./development-guide.md)

Development workflow, testing, building, contributing, and troubleshooting.

---

## Quick Navigation

### For Users

**Want to use BMAD through your AI assistant?**

1. Installation → [README.md](../README.md)
2. Configuration → [README.md - Setup](../README.md#-installation)
3. Usage → [API Contracts - MCP Tools](./api-contracts.md#mcp-tools-api)

### For Developers

**Want to contribute or modify the code?**

1. Setup → [Development Guide - Quick Start](./development-guide.md#quick-start)
2. Architecture → [Architecture](./architecture.md)
3. API Reference → [API Contracts - TypeScript API](./api-contracts.md#typescript-api-internal)
4. Testing → [Development Guide - Testing](./development-guide.md#testing)

---

## Additional Resources

- **BMAD Method:** https://github.com/bmad-code-org/BMAD-METHOD
- **MCP Specification:** https://modelcontextprotocol.io/
- **Repository:** https://github.com/mkellerman/bmad-mcp-server
- **Issues:** https://github.com/mkellerman/bmad-mcp-server/issues

---

## What's New in v4.0

**Major Changes:**

- ✅ **Unified Tool Architecture** - Single `bmad` tool replaces 100+ individual agent tools
- ✅ **Transport-Agnostic Engine** - Core business logic separated from MCP layer
- ✅ **Improved Operation Model** - Clear separation: list, read, execute
- ✅ **Better Documentation** - Consolidated from 12 files to 4 essential docs
- ✅ **Enhanced Testing** - Comprehensive unit, integration, and e2e test suites

**Migration:** Users upgrading from v3.x should review the [API Contracts](./api-contracts.md#migration-from-v3x) migration guide.

---

## Documentation Philosophy

We maintain **minimal essential documentation** focused on:

1. **README.md** - Quick start and usage
2. **Architecture** - System design
3. **API Contracts** - Interface specifications
4. **Development Guide** - Contributing workflow

Everything else is either consolidated into these 4 docs or archived for reference.

This approach:

- ✅ Reduces maintenance burden
- ✅ Prevents documentation drift
- ✅ Makes it easier to find information
- ✅ Ensures accuracy through focused review

---

## Additional Resources

---

## 📚 Documentation Structure

### Core Documentation

\`\`\`
├── 📄 README.md # Project overview
├── 📄 deployment-guide.md # Installation and deployment
├── 📄 api-contracts.md # MCP tools and APIs
└── 📄 architecture.md # System design
\`\`\`

### Development Documentation

\`\`\`
├── 📄 development-guide.md # Development workflow
├── 📄 testing-guide.md # Testing strategy
├── 📄 project-overview.md # Project foundation
└── 📄 CHANGELOG.md # Version history
\`\`\`

---

## 🔍 What's What

| Document                                  | Purpose                              | Audience                |
| ----------------------------------------- | ------------------------------------ | ----------------------- |
| [README.md](../README.md)                 | Project introduction and quick start | Everyone                |
| [Deployment Guide](deployment-guide.md)   | Installation and configuration       | Users, Admins           |
| [Architecture](architecture.md)           | System design and components         | Developers              |
| [API Contracts](api-contracts.md)         | Tool and API reference               | Developers, Integrators |
| [Development Guide](development-guide.md) | Development workflow                 | Contributors            |
| [Testing Guide](testing-guide.md)         | Test strategy and examples           | Contributors            |
| [Project Overview](project-overview.md)   | Technical foundation                 | Everyone                |

---

## 📝 Contributing to Documentation

Found an issue or want to improve the docs?

1. Check [Development Guide](development-guide.md) for setup
2. Make your changes
3. Run \`npm run lint:fix\` and \`npm run format\`
4. Submit a pull request

---

## 📞 Getting Help

- **Issues:** [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)
- **Documentation:** You're reading it! Start with [README.md](../README.md)
