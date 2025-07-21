import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';
import { ApiClient } from '../../utils/apiClient';
import * as fs from 'fs';

export class RagPipelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ragPipeline';

  private _view?: vscode.WebviewView;
  private _apiClient: ApiClient;
  private _documents: {id: string, name: string}[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._apiClient = ApiClient.getInstance();
  }

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

    // Load documents when view becomes visible
    this._loadDocuments();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data: any) => {
      try {
        switch (data.type) {
          case 'uploadDocument':
            await this._handleDocumentUpload();
            break;
          case 'refreshDocuments':
            await this._loadDocuments();
            break;
          case 'deleteDocument':
            await this._deleteDocument(data.documentId);
            break;
          case 'viewDocumentChunks':
            await this._viewDocumentChunks(data.documentId);
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
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    });
  }

  private async _loadDocuments() {
    try {
      this._documents = await this._apiClient.listDocuments();
      
      if (this._view) {
        this._view.webview.postMessage({
          type: 'documentsLoaded',
          documents: this._documents
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to load documents: ${error.message}`);
    }
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
      try {
        vscode.window.showInformationMessage(`Uploading ${fileUris.length} document(s)...`);
        
        for (const fileUri of fileUris) {
          const fileData = await fs.promises.readFile(fileUri.fsPath);
          const fileName = fileUri.fsPath.split(/[\\/]/).pop() || 'unknown.file';
          
          // Use FormData directly in the API client instead of File object
          await this._apiClient.uploadDocument(fileData, fileName);
        }
        
        vscode.window.showInformationMessage('Documents uploaded successfully');
        await this._loadDocuments(); // Refresh document list
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to upload documents: ${error.message}`);
      }
    }
  }
  
  private _getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  }
  
  private async _deleteDocument(documentId: string) {
    try {
      await this._apiClient.deleteDocument(documentId);
      vscode.window.showInformationMessage('Document deleted successfully');
      await this._loadDocuments(); // Refresh document list
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to delete document: ${error.message}`);
    }
  }
  
  private async _viewDocumentChunks(documentId: string) {
    try {
      const chunks = await this._apiClient.getDocumentChunks(documentId);
      
      if (this._view) {
        this._view.webview.postMessage({
          type: 'chunksLoaded',
          documentId,
          chunks
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to load document chunks: ${error.message}`);
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
        .small-btn {
          padding: 4px 8px;
          font-size: 0.8em;
        }
        .hidden {
          display: none;
        }
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
        }
        .modal-content {
          background-color: var(--vscode-editor-background);
          padding: 20px;
          border-radius: 4px;
          max-width: 80%;
          max-height: 80%;
          overflow: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          padding: 0;
          margin: 0;
        }
        .chunk-item {
          padding: 10px;
          margin-bottom: 10px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
        }
        .refresh-btn {
          margin-left: 10px;
          padding: 4px 8px;
          font-size: 0.8em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>RAG Pipeline</h3>
        
        <div class="section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4>Document Management</h4>
            <button id="refresh-btn" class="refresh-btn">Refresh</button>
          </div>
          <button id="upload-btn">Upload Documents</button>
          
          <div class="document-list" id="document-list">
            <div id="document-list-placeholder">Loading documents...</div>
          </div>
        </div>
        
        <div class="section">
          <h4>RAG Operations</h4>
          <div class="form-row">
            <label for="rag-operation-select">Operation:</label>
            <select id="rag-operation-select">
              <option value="query">Query Documents</option>
              <option value="analyze">Analyze Corpus</option>
            </select>
          </div>
          <div class="form-row">
            <label for="query-input">Query:</label>
            <input type="text" id="query-input" placeholder="Enter your query here">
          </div>
          <button id="execute-rag-btn">Execute</button>
        </div>
      </div>
      
      <!-- Chunks Modal -->
      <div id="chunks-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h4 id="chunks-modal-title">Document Chunks</h4>
            <button id="close-chunks-modal" class="close-btn">&times;</button>
          </div>
          <div id="chunks-container">
            <!-- Chunks will be loaded here -->
          </div>
        </div>
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const uploadBtn = document.getElementById('upload-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const executeRagBtn = document.getElementById('execute-rag-btn');
        const ragOperationSelect = document.getElementById('rag-operation-select');
        const documentList = document.getElementById('document-list');
        const chunksModal = document.getElementById('chunks-modal');
        const chunksModalTitle = document.getElementById('chunks-modal-title');
        const closeChunksModalBtn = document.getElementById('close-chunks-modal');
        const chunksContainer = document.getElementById('chunks-container');
        
        // Upload documents
        uploadBtn.addEventListener('click', () => {
          vscode.postMessage({
            type: 'uploadDocument'
          });
        });
        
        // Refresh document list
        refreshBtn.addEventListener('click', () => {
          documentList.innerHTML = '<div id="document-list-placeholder">Loading documents...</div>';
          vscode.postMessage({
            type: 'refreshDocuments'
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
        
        // Close chunks modal
        closeChunksModalBtn.addEventListener('click', () => {
          chunksModal.classList.add('hidden');
        });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            case 'documentsLoaded':
              renderDocumentList(message.documents);
              break;
            case 'chunksLoaded':
              renderDocumentChunks(message.documentId, message.chunks);
              break;
          }
        });
        
        // Render document list
        function renderDocumentList(documents) {
          documentList.innerHTML = '';
          
          if (documents.length === 0) {
            documentList.innerHTML = '<div id="document-list-placeholder">No documents found</div>';
            return;
          }
          
          documents.forEach(doc => {
            const docItem = document.createElement('div');
            docItem.className = 'document-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = doc.name;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'small-btn';
            viewBtn.textContent = 'View Chunks';
            viewBtn.addEventListener('click', () => {
              vscode.postMessage({
                type: 'viewDocumentChunks',
                documentId: doc.id
              });
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'small-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => {
              if (confirm('Are you sure you want to delete ' + doc.name + '?')) {
                vscode.postMessage({
                  type: 'deleteDocument',
                  documentId: doc.id
                });
              }
            });
            
            actionsDiv.appendChild(viewBtn);
            actionsDiv.appendChild(deleteBtn);
            
            docItem.appendChild(nameSpan);
            docItem.appendChild(actionsDiv);
            
            documentList.appendChild(docItem);
          });
        }
        
        // Render document chunks
        function renderDocumentChunks(documentId, chunks) {
          // Find document name
          const documentName = findDocumentNameById(documentId);
          chunksModalTitle.textContent = 'Chunks for ' + (documentName || 'Document');
          
          chunksContainer.innerHTML = '';
          
          if (chunks.length === 0) {
            chunksContainer.innerHTML = '<div>No chunks found for this document</div>';
          } else {
            chunks.forEach((chunk, index) => {
              const chunkItem = document.createElement('div');
              chunkItem.className = 'chunk-item';
              
              const chunkHeader = document.createElement('h5');
              chunkHeader.textContent = 'Chunk ' + (index + 1);
              
              const chunkContent = document.createElement('div');
              chunkContent.textContent = chunk.content;
              
              chunkItem.appendChild(chunkHeader);
              chunkItem.appendChild(chunkContent);
              
              chunksContainer.appendChild(chunkItem);
            });
          }
          
          chunksModal.classList.remove('hidden');
        }
        
        // Helper function to find document name by ID
        function findDocumentNameById(documentId) {
          const documents = vscode.getState()?.documents || [];
          const document = documents.find(doc => doc.id === documentId);
          return document ? document.name : null;
        }
        
        // Initialize by requesting documents
        vscode.postMessage({
          type: 'refreshDocuments'
        });
      </script>
    </body>
    </html>`;
  }
}