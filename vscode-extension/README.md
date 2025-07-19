# DC Artisan

DC Artisan is a VS Code extension that provides prompt enhancement and RAG pipeline tools for developers.

## Features

### Prompt Enhance
- Markdown-based prompt editing
- Highlights variables in {} format, e.g., {language}, {task}
- Input test values for variables and preview the result with substitutions
- Test with various providers like ChatGPT, Claude, Gemini, etc.

### RAG Pipeline Mode
- Document Management:
  - Upload and embed new documents directly into the vector database
  - Extract text from common formats: PDF, PPT, DOCX, etc.
- Embedding Operations:
  - Atomically view, update, and delete individual text chunks
  - Copy documents or namespaces without re-embedding (cost-efficient operations)
- Multi-User Features:
  - Full support for multi-user backend instances
  - Includes user/session tracking and audit logs

## Requirements

- VS Code 1.60.0 or higher
- InterSystems IRIS backend for RAG services

## Extension Settings

This extension contributes the following settings:

* `dc-artisan.defaultProvider`: Default AI provider for prompt testing
* `dc-artisan.defaultNamespace`: Default namespace for RAG operations

## Known Issues

- Initial release, please report any issues on the GitHub repository

## Release Notes

### 1.0.0

Initial release of DC Artisan