import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';
import { ApiClient } from '../../utils/apiClient';
import * as fs from 'fs';
import * as path from 'path';

export class RagPipelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ragPipeline';

  private _view?: vscode.WebviewView;
  private _apiClient: ApiClient;


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



    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data: any) => {
      try {
        switch (data.type) {
          case 'ingestDocument':
            await this._handleDocumentIngest(data.collection, data.chunkSize, data.files);
            break;

        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    });
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
        const allowedTypes = ['pdf', 'docx', 'rtf', 'txt', 'md', 'markdown'];
        
        if (!allowedTypes.includes(fileExtension)) {
          vscode.window.showWarningMessage(`Skipping ${file.name}: Only PDF, DOCX, RTF, TXT, MD, and Markdown files are allowed`);
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

    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to ingest documents: ${error.message}`);
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
          
          <div class="drop-zone" id="drop-zone" style="display: none;">
            <p>Drag and drop files here or click to select</p>
            <p style="font-size: 0.8em; color: var(--vscode-descriptionForeground);">Supported: PDF, DOCX, RTF, TXT, MD, Markdown</p>
            <input type="file" id="file-input" multiple accept=".pdf,.docx,.rtf,.txt,.md,.markdown" style="display: none;">
          </div>
          
          <div class="file-list" id="file-list" style="display: none;"></div>
          
          <button id="ingest-btn" disabled>Ingest Documents</button>
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
          const allowedTypes = ['pdf', 'docx', 'rtf', 'txt', 'md', 'markdown'];
          
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
                message: 'File ' + file.name + ' is not supported. Only PDF, DOCX, RTF, TXT, MD, and Markdown files are allowed.'
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
        
        // Input validation and show file input when collection is entered
        collectionInput.addEventListener('input', () => {
          const hasCollection = collectionInput.value.trim() !== '';
          if (hasCollection) {
            dropZone.style.display = 'block';
          } else {
            dropZone.style.display = 'none';
            selectedFiles = [];
            updateFileList();
          }
          updateIngestButton();
        });
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
        

        
        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            // No message handling needed
          }
        });
        

      </script>
    </body>
    </html>`;
  }
}