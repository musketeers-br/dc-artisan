import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';

export class PromptEnhanceProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'promptEnhance';

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
        case 'testPrompt':
          // Handle prompt testing with different providers
          vscode.window.showInformationMessage(`Testing prompt with ${data.provider}`);
          // Here you would implement the actual API call to the selected provider
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Prompt Enhance</title>
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
          gap: 10px;
        }
        textarea {
          width: 100%;
          height: 200px;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          padding: 5px;
          font-family: var(--vscode-editor-font-family);
          resize: vertical;
        }
        .variables {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .variable-row {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .variable-name {
          flex: 1;
          font-weight: bold;
        }
        .variable-value {
          flex: 2;
        }
        input, select, button {
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          padding: 5px;
        }
        button {
          cursor: pointer;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 12px;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .preview {
          margin-top: 10px;
          padding: 10px;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border: 1px solid var(--vscode-input-border);
          white-space: pre-wrap;
        }
        .highlight {
          background-color: rgba(255, 255, 0, 0.2);
          border-radius: 2px;
          padding: 0 2px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>Prompt Enhance</h3>
        <div>
          <label for="prompt-text">Prompt Template (use {variable} for variables):</label>
          <textarea id="prompt-text" placeholder="Write your prompt here. Use {variable} syntax for variables.">I want you to translate the following text to {language}:
{text}</textarea>
        </div>
        
        <div class="variables" id="variables-container">
          <!-- Variables will be added here dynamically -->
        </div>
        
        <div>
          <button id="add-variable">Add Variable</button>
        </div>
        
        <div>
          <h4>Preview</h4>
          <div class="preview" id="preview">
            <!-- Preview will be shown here -->
          </div>
        </div>
        
        <div>
          <h4>Test with Provider</h4>
          <div style="display: flex; gap: 10px;">
            <select id="provider-select">
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
            <button id="test-button">Test Prompt</button>
          </div>
        </div>
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const promptTextarea = document.getElementById('prompt-text');
        const variablesContainer = document.getElementById('variables-container');
        const previewElement = document.getElementById('preview');
        const addVariableButton = document.getElementById('add-variable');
        const providerSelect = document.getElementById('provider-select');
        const testButton = document.getElementById('test-button');
        
        // Extract variables from prompt text
        function extractVariables(text) {
          const regex = /{([^}]+)}/g;
          const variables = new Set();
          let match;
          
          while ((match = regex.exec(text)) !== null) {
            variables.add(match[1]);
          }
          
          return Array.from(variables);
        }
        
        // Update the variables UI
        function updateVariablesUI() {
          const variables = extractVariables(promptTextarea.value);
          variablesContainer.innerHTML = '';
          
          variables.forEach(variable => {
            const row = document.createElement('div');
            row.className = 'variable-row';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'variable-name';
            nameSpan.textContent = variable + ':';
            
            const valueInput = document.createElement('input');
            valueInput.className = 'variable-value';
            valueInput.type = 'text';
            valueInput.dataset.variable = variable;
            valueInput.placeholder = 'Enter value for ' + variable;
            valueInput.addEventListener('input', updatePreview);
            
            row.appendChild(nameSpan);
            row.appendChild(valueInput);
            variablesContainer.appendChild(row);
          });
          
          updatePreview();
        }
        
        // Update the preview with variable substitutions
        function updatePreview() {
          let previewText = promptTextarea.value;
          const inputs = document.querySelectorAll('.variable-value');
          
          inputs.forEach(input => {
            const variable = input.dataset.variable;
            const value = input.value || '{' + variable + '}';
            const regex = new RegExp('{' + variable + '}', 'g');
            previewText = previewText.replace(regex, value);
          });
          
          // Highlight remaining variables
          previewText = previewText.replace(/{([^}]+)}/g, '<span class="highlight">{$1}</span>');
          previewElement.innerHTML = previewText;
        }
        
        // Add a new variable manually
        addVariableButton.addEventListener('click', () => {
          const variableName = prompt('Enter variable name (without {} brackets):');
          if (variableName) {
            promptTextarea.value += ' {' + variableName + '}';
            updateVariablesUI();
          }
        });
        
        // Test the prompt with selected provider
        testButton.addEventListener('click', () => {
          const provider = providerSelect.value;
          const promptText = previewElement.textContent;
          
          vscode.postMessage({
            type: 'testPrompt',
            provider: provider,
            prompt: promptText
          });
        });
        
        // Initialize
        promptTextarea.addEventListener('input', updateVariablesUI);
        updateVariablesUI();
      </script>
    </body>
    </html>`;
  }
}