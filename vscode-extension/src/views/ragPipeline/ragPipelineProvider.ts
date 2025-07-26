import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';
import { ApiClient } from '../../utils/apiClient';
import * as fs from 'fs';
import * as path from 'path';

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
          case 'ingestDocument':
            await this._handleDocumentIngest(data.collection, data.chunkSize, data.files);
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
          case 'executeRagOperation':
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

  private async _handleDocumentIngest(collection: string, chunkSize: number, files: {name: string, data: string}[]) {
    if (!collection || !chunkSize || !files || files.length === 0) {
      vscode.window.showErrorMessage('Collection name, chunk size, and files are required');
      return;
    }

    try {
      vscode.window.showInformationMessage(`Ingesting ${files.length} document(s) into collection "${collection}"...`);
      
      for (const file of files) {
        const fileExtension = path.extname(file.name).toLowerCase().substring(1);
        const allowedTypes = ['pdf', 'docx', 'rtf', 'md', 'markdown'];
        
        if (!allowedTypes.includes(fileExtension)) {
          vscode.window.showWarningMessage(`Skipping ${file.name}: Only PDF, DOCX, RTF, MD, and Markdown files are allowed`);
          continue;
        }

        const fileType = fileExtension === 'markdown' ? 'md' : fileExtension;
        
        const response = await this._apiClient.ingestDocument({
          document: file.data,
          chunkSize: chunkSize.toString(),
          collection: collection,
          fileType: fileType
        });
        
        if (response.error) {
          vscode.window.showErrorMessage(`Error ingesting ${file.name}: ${response.error}`);
        } else {
          vscode.window.showInformationMessage(
            `Successfully ingested ${file.name} into collection "${response.collection}". Total documents: ${response.totalDocuments}`
          );
        }
      }
      
      await this._loadDocuments(); // Refresh document list
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to ingest documents: ${error.message}`);
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
        .drop-zone {
          border: 2px dashed var(--vscode-input-border);
          border-radius: 4px;
          padding: 20px;
          text-align: center;
          margin: 10px 0;
          transition: border-color 0.3s;
        }
        .drop-zone.drag-over {
          border-color: var(--vscode-button-background);
          background-color: var(--vscode-button-background);
          opacity: 0.1;
        }
        .file-list {
          margin-top: 10px;
          max-height: 150px;
          overflow-y: auto;
        }
        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .file-item:last-child {
          border-bottom: none;
        }
        .remove-file {
          background: none;
          border: none;
          color: var(--vscode-errorForeground);
          cursor: pointer;
          padding: 2px 6px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>RAG Pipeline</h3>
        
        <div class="section">
          <h4>Document Ingestion</h4>
          
          <div class="form-row">
            <label for="collection-input">Collection Name:</label>
            <input type="text" id="collection-input" placeholder="Enter collection name" required>
          </div>
          
          <div class="form-row">
            <label for="chunk-size-input">Chunk Token Size:</label>
            <input type="number" id="chunk-size-input" placeholder="1000" min="100" max="8000" value="1000" required>
          </div>
          
          <div class="drop-zone" id="drop-zone">
            <p>Drag and drop files here or click to select</p>
            <p style="font-size: 0.8em; color: var(--vscode-descriptionForeground);">Supported: PDF, DOCX, RTF, MD, Markdown</p>
            <input type="file" id="file-input" multiple accept=".pdf,.docx,.rtf,.md,.markdown" style="display: none;">
          </div>
          
          <div class="file-list" id="file-list" style="display: none;"></div>
          
          <button id="ingest-btn" disabled>Ingest Documents</button>
        </div>
        
        <div class="section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4>Document Management</h4>
            <button id="refresh-btn" class="refresh-btn">Refresh</button>
          </div>
          
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
        const collectionInput = document.getElementById('collection-input');
        const chunkSizeInput = document.getElementById('chunk-size-input');
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const fileList = document.getElementById('file-list');
        const ingestBtn = document.getElementById('ingest-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const executeRagBtn = document.getElementById('execute-rag-btn');
        const ragOperationSelect = document.getElementById('rag-operation-select');
        const documentList = document.getElementById('document-list');
        const chunksModal = document.getElementById('chunks-modal');
        const chunksModalTitle = document.getElementById('chunks-modal-title');
        const closeChunksModalBtn = document.getElementById('close-chunks-modal');
        const chunksContainer = document.getElementById('chunks-container');
        
        let selectedFiles = [];
        
        // File handling
        dropZone.addEventListener('click', () => {
          fileInput.click();
        });
        
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
          dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('drag-over');
          handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
          handleFiles(e.target.files);
        });
        
        function handleFiles(files) {
          const allowedTypes = ['pdf', 'docx', 'rtf', 'md', 'markdown'];
          
          Array.from(files).forEach(file => {
            const extension = file.name.split('.').pop().toLowerCase();
            if (allowedTypes.includes(extension)) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(e.target.result)));
                selectedFiles.push({
                  name: file.name,
                  data: base64Data
                });
                updateFileList();
                updateIngestButton();
              };
              reader.readAsArrayBuffer(file);
            } else {
              vscode.postMessage({
                type: 'error',
                message: 'File ' + file.name + ' is not supported. Only PDF, DOCX, RTF, MD, and Markdown files are allowed.'
              });
            }
          });
        }
        
        function updateFileList() {
          if (selectedFiles.length === 0) {
            fileList.style.display = 'none';
            return;
          }
          
          fileList.style.display = 'block';
          fileList.innerHTML = '';
          
          selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => {
              selectedFiles.splice(index, 1);
              updateFileList();
              updateIngestButton();
            });
            
            fileItem.appendChild(fileName);
            fileItem.appendChild(removeBtn);
            fileList.appendChild(fileItem);
          });
        }
        
        function updateIngestButton() {
          const hasCollection = collectionInput.value.trim() !== '';
          const hasChunkSize = chunkSizeInput.value.trim() !== '' && parseInt(chunkSizeInput.value) > 0;
          const hasFiles = selectedFiles.length > 0;
          
          ingestBtn.disabled = !(hasCollection && hasChunkSize && hasFiles);
        }
        
        // Input validation
        collectionInput.addEventListener('input', updateIngestButton);
        chunkSizeInput.addEventListener('input', updateIngestButton);
        
        // Ingest documents
        ingestBtn.addEventListener('click', () => {
          const collection = collectionInput.value.trim();
          const chunkSize = parseInt(chunkSizeInput.value);
          
          if (!collection || !chunkSize || selectedFiles.length === 0) {
            return;
          }
          
          vscode.postMessage({
            type: 'ingestDocument',
            collection: collection,
            chunkSize: chunkSize,
            files: selectedFiles
          });
          
          // Clear form after ingestion
          selectedFiles = [];
          updateFileList();
          updateIngestButton();
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