import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';
import { ApiClient } from '../../utils/apiClient';

export class PromptEnhanceProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'promptEnhance';

  private _view?: vscode.WebviewView;
  private _apiClient: ApiClient;
  private _originalPrompt: string = '';
  private _clarifyingQuestions: string[] = [];

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
    webviewView.webview.onDidReceiveMessage(async (data) => {
      try {
        switch (data.type) {
          case 'optimizePrompt':
            await this._optimizePrompt(data.prompt);
            break;
          case 'submitResponses':
            await this._submitResponses(data.responses);
            break;
          case 'testPrompt':
            // Handle prompt testing with different providers
            vscode.window.showInformationMessage(`Testing prompt with ${data.provider}`);
            break;
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    });
  }

  private async _optimizePrompt(prompt: string) {
    try {
      vscode.window.showInformationMessage('Optimizing prompt...');
      const result = await this._apiClient.optimizePrompt(prompt);
      this._originalPrompt = result.originalPrompt;
      this._clarifyingQuestions = result.clarifyingQuestions;
      
      // Send the clarifying questions back to the webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'clarifyingQuestions',
          questions: this._clarifyingQuestions
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to optimize prompt: ${error.message}`);
    }
  }

  private async _submitResponses(responses: string[]) {
    try {
      vscode.window.showInformationMessage('Processing responses...');
      const result = await this._apiClient.submitResponses(responses);
      
      // Send the optimized prompt back to the webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'optimizedPrompt',
          prompt: result.optimizedPrompt
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to process responses: ${error.message}`);
    }
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
          height: 150px;
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
        .questions-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .question-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 10px;
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
        }
        .question-text {
          font-weight: bold;
        }
        .hidden {
          display: none;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--vscode-panel-border);
          margin-bottom: 10px;
        }
        .tab {
          padding: 8px 16px;
          cursor: pointer;
          border: 1px solid transparent;
          border-bottom: none;
          margin-bottom: -1px;
        }
        .tab.active {
          background-color: var(--vscode-editor-background);
          border-color: var(--vscode-panel-border);
          border-bottom-color: var(--vscode-editor-background);
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <div class="tab active" data-tab="template">Template</div>
          <div class="tab" data-tab="optimize">Optimize</div>
        </div>
        
        <div id="template-tab" class="tab-content active">
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
        
        <div id="optimize-tab" class="tab-content">
          <div>
            <label for="original-prompt">Original Prompt:</label>
            <textarea id="original-prompt" placeholder="Enter your prompt to optimize"></textarea>
            <button id="optimize-button" style="margin-top: 10px;">Optimize Prompt</button>
          </div>
          
          <div id="questions-section" class="hidden">
            <h4>Clarifying Questions</h4>
            <div id="questions-container" class="questions-container">
              <!-- Questions will be added here dynamically -->
            </div>
            <button id="submit-responses-button" style="margin-top: 10px;">Submit Responses</button>
          </div>
          
          <div id="optimized-section" class="hidden">
            <h4>Optimized Prompt</h4>
            <div class="preview" id="optimized-prompt">
              <!-- Optimized prompt will be shown here -->
            </div>
            <button id="copy-optimized-button" style="margin-top: 10px;">Copy to Clipboard</button>
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
        
        // Optimize tab elements
        const originalPromptTextarea = document.getElementById('original-prompt');
        const optimizeButton = document.getElementById('optimize-button');
        const questionsSection = document.getElementById('questions-section');
        const questionsContainer = document.getElementById('questions-container');
        const submitResponsesButton = document.getElementById('submit-responses-button');
        const optimizedSection = document.getElementById('optimized-section');
        const optimizedPromptElement = document.getElementById('optimized-prompt');
        const copyOptimizedButton = document.getElementById('copy-optimized-button');
        
        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            tabContents.forEach(content => {
              content.classList.remove('active');
              if (content.id === tabId + '-tab') {
                content.classList.add('active');
              }
            });
          });
        });
        
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
        
        // Optimize prompt
        optimizeButton.addEventListener('click', () => {
          const promptText = originalPromptTextarea.value.trim();
          if (!promptText) {
            alert('Please enter a prompt to optimize');
            return;
          }
          
          vscode.postMessage({
            type: 'optimizePrompt',
            prompt: promptText
          });
        });
        
        // Submit responses to clarifying questions
        submitResponsesButton.addEventListener('click', () => {
          const responses = [];
          const responseInputs = document.querySelectorAll('.question-response');
          
          responseInputs.forEach(input => {
            responses.push(input.value);
          });
          
          vscode.postMessage({
            type: 'submitResponses',
            responses: responses
          });
        });
        
        // Copy optimized prompt to clipboard
        copyOptimizedButton.addEventListener('click', () => {
          const optimizedText = optimizedPromptElement.textContent;
          navigator.clipboard.writeText(optimizedText)
            .then(() => {
              alert('Copied to clipboard!');
            })
            .catch(err => {
              console.error('Failed to copy: ', err);
            });
        });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            case 'clarifyingQuestions':
              displayClarifyingQuestions(message.questions);
              break;
            case 'optimizedPrompt':
              displayOptimizedPrompt(message.prompt);
              break;
          }
        });
        
        // Display clarifying questions
        function displayClarifyingQuestions(questions) {
          questionsContainer.innerHTML = '';
          
          questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            questionText.textContent = question;
            
            const responseInput = document.createElement('textarea');
            responseInput.className = 'question-response';
            responseInput.placeholder = 'Your response...';
            
            questionItem.appendChild(questionText);
            questionItem.appendChild(responseInput);
            questionsContainer.appendChild(questionItem);
          });
          
          questionsSection.classList.remove('hidden');
          optimizedSection.classList.add('hidden');
        }
        
        // Display optimized prompt
        function displayOptimizedPrompt(prompt) {
          optimizedPromptElement.textContent = prompt;
          optimizedSection.classList.remove('hidden');
        }
        
        // Initialize
        promptTextarea.addEventListener('input', updateVariablesUI);
        updateVariablesUI();
      </script>
    </body>
    </html>`;
  }
  }
}