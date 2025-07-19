import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';

export class RagPipelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ragPipeline';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'uploadDocument':
          // Handle document upload
          this._handleDocumentUpload();
          break;
        case 'manageEmbeddings':
          // Handle embedding management
          vscode.window.showInformationMessage('Managing embeddings');
          break;
        case 'executeRagOperation':
          // Handle RAG operation
          vscode.window.showInformationMessage(`Executing RAG operation: ${data.operation}`);
          break;
      }
    });
  }

  private async _handleDocumentUpload() {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: 'Upload Documents',
      filters: {
        'Documents': ['pdf', 'docx', 'pptx', 'txt']
      }
    });

    if (fileUris && fileUris.length > 0) {
      vscode.window.showInformationMessage(`Selected ${fileUris.length} document(s) for upload`);
      // Here you would implement the actual document upload to the backend
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>RAG Pipeline</title>
      <style>
        body {
          padding: 10px;
          color: var(--vscode-foreground);
          font-family: var(--vscode-font-family);
          background-color: var(--vscode-editor-background);
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .section {
          border: 1px solid var(--vscode-panel-border);
          padding: 10px;
          border-radius: 4px;
        }
        h3, h4 {
          margin-top: 0;
        }
        button {
          cursor: pointer;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 12px;
          margin: 5px 0;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        select, input {
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          padding: 5px;
          margin: 5px 0;
        }
        .form-row {
          display: flex;
          flex-direction: column;
          margin-bottom: 10px;
        }
        .form-row label {
          margin-bottom: 5px;
        }
        .document-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--vscode-input-border);
          padding: 5px;
          margin-top: 10px;
        }
        .document-item {
          padding: 5px;
          border-bottom: 1px solid var(--vscode-panel-border);
          display: flex;
          justify-content: space-between;
        }
        .document-item:last-child {
          border-bottom: none;
        }
        .actions {
          display: flex;
          gap: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>RAG Pipeline</h3>
        
        <div class="section">
          <h4>Document Management</h4>
          <button id="upload-btn">Upload Documents</button>
          <div class="form-row">
            <label for="namespace-select">Namespace:</label>
            <select id="namespace-select">
              <option value="default">Default</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div class="document-list" id="document-list">
            <div class="document-item">
              <span>example-document.pdf</span>
              <div class="actions">
                <button class="small-btn">View</button>
                <button class="small-btn">Delete</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h4>Embedding Operations</h4>
          <div class="form-row">
            <label for="operation-select">Operation:</label>
            <select id="operation-select">
              <option value="view">View Embeddings</option>
              <option value="update">Update Embeddings</option>
              <option value="delete">Delete Embeddings</option>
              <option value="copy">Copy Embeddings</option>
            </select>
          </div>
          <button id="manage-embeddings-btn">Manage Embeddings</button>
        </div>
        
        <div class="section">
          <h4>RAG Operations</h4>
          <div class="form-row">
            <label for="rag-operation-select">Operation:</label>
            <select id="rag-operation-select">
              <option value="query">Query Documents</option>
              <option value="analyze">Analyze Corpus</option>
              <option value="export">Export Data</option>
            </select>
          </div>
          <div class="form-row">
            <label for="query-input">Query:</label>
            <input type="text" id="query-input" placeholder="Enter your query here">
          </div>
          <button id="execute-rag-btn">Execute</button>
        </div>
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const uploadBtn = document.getElementById('upload-btn');
        const manageEmbeddingsBtn = document.getElementById('manage-embeddings-btn');
        const executeRagBtn = document.getElementById('execute-rag-btn');
        const operationSelect = document.getElementById('operation-select');
        const ragOperationSelect = document.getElementById('rag-operation-select');
        
        // Upload documents
        uploadBtn.addEventListener('click', () => {
          vscode.postMessage({
            type: 'uploadDocument'
          });
        });
        
        // Manage embeddings
        manageEmbeddingsBtn.addEventListener('click', () => {
          vscode.postMessage({
            type: 'manageEmbeddings',
            operation: operationSelect.value
          });
        });
        
        // Execute RAG operation
        executeRagBtn.addEventListener('click', () => {
          const queryInput = document.getElementById('query-input');
          vscode.postMessage({
            type: 'executeRagOperation',
            operation: ragOperationSelect.value,
            query: queryInput.value
          });
        });
      </script>
    </body>
    </html>`;
  }
}