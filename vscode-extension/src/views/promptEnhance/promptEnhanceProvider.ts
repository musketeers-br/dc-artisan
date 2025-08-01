import * as vscode from 'vscode';
import { getNonce } from '../../utils/nonce';
import { ApiClient } from '../../utils/apiClient';
import * as fs from 'fs';
const os = require('os');

export class PromptEnhanceProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'promptEnhance';

  private _view?: vscode.WebviewView;
  private _apiClient: ApiClient;
  private _originalPrompt: string = '';
  private _clarifyingQuestions: string[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._apiClient = ApiClient.getInstance();
    // Initialize API client when provider is created
    this._apiClient.initialize().catch(error => {
      console.error('Failed to initialize API client in PromptEnhanceProvider:', error);
    });
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
          case 'optimizePreviewPrompt':
            await this._optimizePreviewPrompt(data.prompt);
            break;
          case 'submitResponses':
            await this._submitResponses(data.responses);
            break;
          case 'testPrompt':// Handle prompt testing with different providers
            // open a file dialog to select a file for testing
            const fileUri = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              filters: {
                'Text files': ['csv'],
                // 'All files': ['*']
              }
            });
            if (fileUri && fileUri[0]) {
              vscode.window.showInformationMessage(`Testing prompt with ${data.provider}, ${data.prompt}`);
              const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
              const testDataset = fileContent.toString();

              // Call the API client to test the prompt with the selected provider
              const result = await this._apiClient.testPrompt(data.provider, data.prompt, testDataset);

              // Write the HTML page in the result variable to a HTML file
              const htmlFileUri = vscode.Uri.joinPath(this._extensionUri, 'testResult.html');
              await vscode.workspace.fs.writeFile(htmlFileUri, Buffer.from(result));

              // // Open the HTML file in a new editor
              // const document = await vscode.workspace.openTextDocument(htmlFileUri);
              // await vscode.window.showTextDocument(document, { preview: false });

              // // Open the HTML file in the default browser
              // const urlToOpen = htmlFileUri.fsPath;
              // vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(urlToOpen));
              // vscode.window.showInformationMessage(`Opening ${urlToOpen} in your default browser.`);
              
              const homeDir = os.homedir();
              console.log('Saving test result to:', homeDir);
              const options: vscode.SaveDialogOptions = {
                  filters: {
                      // 'All Files': ['*'], 
                      'Text Files': ['html'],
                  },
                  defaultUri: vscode.Uri.file(`${homeDir}/report.html`)
              };

              const uri = await vscode.window.showSaveDialog(options);

              if (uri) {
                  // User selected a location and filename
                  const filePath = uri.fsPath;

                  const fileContent = result; 

                  try {
                      fs.writeFileSync(filePath, fileContent);
                      vscode.window.showInformationMessage(`File downloaded to: ${filePath}`);
                  } catch (error: any) {
                      vscode.window.showErrorMessage(`Error saving file: ${error.message}`);
                  }
              } else {
                  // User cancelled the dialog
                  vscode.window.showInformationMessage('File download cancelled.');
              }
            } else {
              vscode.window.showErrorMessage('No file selected for testing prompt.');
            }

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

  private async _optimizePreviewPrompt(previewPrompt: string) {
    try {
      if (!previewPrompt || previewPrompt.trim() === '') {
        vscode.window.showErrorMessage('Preview prompt is empty. Please enter a prompt first.');
        return;
      }
      
      vscode.window.showInformationMessage('Optimizing preview prompt...');
      console.log('Optimizing preview prompt:', previewPrompt);
      
      // Ensure API client is initialized
      await this._apiClient.initialize();
      
      const result = await this._apiClient.optimizePrompt(previewPrompt);
      console.log('Optimization result:', result);
      
      this._originalPrompt = result.originalPrompt;
      this._clarifyingQuestions = result.clarifyingQuestions;
      
      // Send the clarifying questions back to the webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'clarifyingQuestions',
          questions: this._clarifyingQuestions
        });
        
        // No need to switch tabs
      }
    } catch (error: any) {
      console.error('Error optimizing preview prompt:', error);
      const errorMessage = `Failed to optimize preview prompt: ${error.message}`;
      vscode.window.showErrorMessage(errorMessage);
      
      // Send error to webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'error',
          error: errorMessage
        });
      }
      
      // Show a more helpful message if it's a connection issue
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Invalid URL')) {
        vscode.commands.executeCommand('dc-artisan.configureApi');
      }
    }
  }

  private async _submitResponses(responses: string[]) {
    try {
      vscode.window.showInformationMessage('Processing responses...');
      
      // Make sure we have the original prompt and clarifying questions
      if (!this._originalPrompt) {
        throw new Error('Original prompt is missing');
      }
      
      if (!this._clarifyingQuestions || this._clarifyingQuestions.length === 0) {
        throw new Error('Clarifying questions are missing');
      }
      
      console.log('Submitting responses with:', {
        originalPrompt: this._originalPrompt,
        clarifyingQuestions: this._clarifyingQuestions,
        userResponses: responses
      });
      
      const result = await this._apiClient.submitResponses(
        this._originalPrompt,
        this._clarifyingQuestions,
        responses
      );
      
      // Send the optimized prompt back to the webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'optimizedPrompt',
          prompt: result.optimizedPrompt,
          keyImprovements: result.keyImprovements
        });
      }
    } catch (error: any) {
      console.error('Error submitting responses:', error);
      vscode.window.showErrorMessage(`Failed to process responses: ${error.message}`);
      
      // Send error to webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'error',
          error: `Failed to process responses: ${error.message}`
        });
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
        .error-message {
          background-color: #f44336;
          color: white;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- No tabs needed -->
        
        <div id="prompt-section">
          <div>
            <label for="prompt-text">Prompt Template (use {variable} for variables):</label>
            <textarea id="prompt-text" placeholder="Write your prompt here. Use {variable} syntax for variables.">I want you to translate the following text to {language}:
{text}</textarea>
          </div>
          
          <div class="variables" id="variables-container">
            <!-- Variables will be added here dynamically -->
          </div>
          
          <div style="margin-top: 20px;">
            <button id="optimize-preview-button">Optimize Prompt</button>
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
        <div>
          <!-- Questions section -->
          <div id="questions-section" class="hidden">
            <h4>Clarifying Questions</h4>
            <div id="questions-container" class="questions-container">
              <!-- Questions will be added here dynamically -->
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button id="back-to-prompt-button">Back to Prompt</button>
              <button id="submit-responses-button">Submit Responses</button>
            </div>
          </div>
          
          <!-- Optimized prompt section -->
          <div id="optimized-section" class="hidden">
            <h4>Optimized Prompt</h4>
            <div class="preview" id="optimized-prompt">
              <!-- Optimized prompt will be shown here -->
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button id="back-to-prompt-from-optimized-button">Back to Prompt</button>
              <button id="copy-optimized-button">Copy to Clipboard</button>
              <button id="update-template-button">Update Template</button>
            </div>
            <div id="key-improvements-section" class="hidden" style="margin-top: 15px;">
              <h4>Key Improvements</h4>
              <div class="preview" id="key-improvements">
                <!-- Key improvements will be shown here -->
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const promptTextarea = document.getElementById('prompt-text');
        const variablesContainer = document.getElementById('variables-container');
        const previewElement = document.getElementById('preview');
        const optimizePreviewButton = document.getElementById('optimize-preview-button');
        const providerSelect = document.getElementById('provider-select');
        const testButton = document.getElementById('test-button');
        
        // Sections
        const promptSection = document.getElementById('prompt-section');
        const questionsSection = document.getElementById('questions-section');
        const optimizedSection = document.getElementById('optimized-section');
        
        // Question and optimized prompt elements
        const questionsContainer = document.getElementById('questions-container');
        const submitResponsesButton = document.getElementById('submit-responses-button');
        const backToPromptButton = document.getElementById('back-to-prompt-button');
        const optimizedPromptElement = document.getElementById('optimized-prompt');
        const copyOptimizedButton = document.getElementById('copy-optimized-button');
        const backToPromptFromOptimizedButton = document.getElementById('back-to-prompt-from-optimized-button');
        const updateTemplateButton = document.getElementById('update-template-button');
        const keyImprovementsSection = document.getElementById('key-improvements-section');
        const keyImprovementsElement = document.getElementById('key-improvements');
        
        // No tab switching needed
        
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
        
        // Optimize the preview prompt
        document.getElementById('optimize-preview-button').addEventListener('click', () => {
          const previewText = previewElement.textContent;
          if (!previewText) {
            alert('Preview is empty');
            return;
          }
          
          // Disable button to prevent multiple clicks
          const button = document.getElementById('optimize-preview-button');
          button.disabled = true;
          button.textContent = 'Optimizing...';
          
          vscode.postMessage({
            type: 'optimizePreviewPrompt',
            prompt: previewText
          });
          
          // Re-enable button after a timeout
          setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Optimize Prompt';
          }, 5000);
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
        
        // No optimize button needed
        
        // Back to prompt button
        backToPromptButton.addEventListener('click', () => {
          promptSection.classList.remove('hidden');
          questionsSection.classList.add('hidden');
          optimizedSection.classList.add('hidden');
        });
        
        // Submit responses to clarifying questions
        submitResponsesButton.addEventListener('click', () => {
          const responses = [];
          const responseInputs = document.querySelectorAll('.question-response');
          
          responseInputs.forEach(input => {
            responses.push(input.value);
          });
          
          // Disable button to prevent multiple clicks
          submitResponsesButton.disabled = true;
          submitResponsesButton.textContent = 'Processing...';
          
          vscode.postMessage({
            type: 'submitResponses',
            responses: responses
          });
          
          // Re-enable button after a timeout
          setTimeout(() => {
            submitResponsesButton.disabled = false;
            submitResponsesButton.textContent = 'Submit Responses';
          }, 5000);
        });
        
        // Back to prompt from optimized section
        backToPromptFromOptimizedButton.addEventListener('click', () => {
          promptSection.classList.remove('hidden');
          questionsSection.classList.add('hidden');
          optimizedSection.classList.add('hidden');
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
        
        // Update template with optimized prompt
        updateTemplateButton.addEventListener('click', () => {
          const optimizedText = optimizedPromptElement.textContent;
          promptTextarea.value = optimizedText;
          
          // Show prompt section and hide optimized section
          promptSection.classList.remove('hidden');
          optimizedSection.classList.add('hidden');
          
          // Update variables UI based on new template
          updateVariablesUI();
          
          // Show success message
          const successDiv = document.createElement('div');
          successDiv.style.backgroundColor = '#4CAF50';
          successDiv.style.color = 'white';
          successDiv.style.padding = '10px';
          successDiv.style.marginBottom = '10px';
          successDiv.style.borderRadius = '4px';
          successDiv.textContent = 'Template updated successfully!';
          document.querySelector('.container').prepend(successDiv);
          
          // Remove success message after 3 seconds
          setTimeout(() => {
            if (successDiv.parentNode) {
              successDiv.parentNode.removeChild(successDiv);
            }
          }, 3000);
        });
        
        // Store original prompt and questions for later use
        let originalPrompt = '';
        let clarifyingQuestions = [];
        
        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            case 'clarifyingQuestions':
              // Store the questions for later submission
              clarifyingQuestions = message.questions;
              // Store the original prompt (from the preview)
              originalPrompt = previewElement.textContent;
              console.log('Stored original prompt:', originalPrompt);
              console.log('Stored clarifying questions:', clarifyingQuestions);
              
              displayClarifyingQuestions(message.questions);
              break;
            case 'optimizedPrompt':
              displayOptimizedPrompt(message.prompt, message.keyImprovements);
              break;
            case 'error':
              // Re-enable the optimize button if there was an error
              const button = document.getElementById('optimize-preview-button');
              button.disabled = false;
              button.textContent = 'Optimize Prompt';
              
              // Display error in the UI
              const errorDiv = document.createElement('div');
              errorDiv.className = 'error-message';
              errorDiv.textContent = message.error;
              document.querySelector('.container').prepend(errorDiv);
              
              // Remove error after 5 seconds
              setTimeout(() => {
                if (errorDiv.parentNode) {
                  errorDiv.parentNode.removeChild(errorDiv);
                }
              }, 5000);
              break;
            // No tab switching needed
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
          
          // Hide prompt section and show questions section
          promptSection.classList.add('hidden');
          questionsSection.classList.remove('hidden');
          optimizedSection.classList.add('hidden');
        }
        
        // Display optimized prompt
        function displayOptimizedPrompt(prompt, keyImprovements) {
          // Re-enable submit button if it was disabled
          submitResponsesButton.disabled = false;
          submitResponsesButton.textContent = 'Submit Responses';
          
          optimizedPromptElement.textContent = prompt;
          
          // Show key improvements if available
          if (keyImprovements) {
            keyImprovementsElement.textContent = keyImprovements;
            keyImprovementsSection.classList.remove('hidden');
          } else {
            keyImprovementsSection.classList.add('hidden');
          }
          
          questionsSection.classList.add('hidden');
          optimizedSection.classList.remove('hidden');
          // Keep prompt section hidden
        }
        
        // Initialize
        promptTextarea.addEventListener('input', updateVariablesUI);
        updateVariablesUI();
      </script>
    </body>
    </html>`;
  }
}