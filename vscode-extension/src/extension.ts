import * as vscode from 'vscode';
import { PromptEnhanceProvider } from './views/promptEnhance/promptEnhanceProvider';
import { RagPipelineProvider } from './views/ragPipeline/ragPipelineProvider';
import { ApiClient } from './utils/apiClient';

export function activate(context: vscode.ExtensionContext) {
  console.log('DC Artisan extension is now active');

  // Initialize API client
  const apiClient = ApiClient.getInstance();
  apiClient.initialize().then(success => {
    if (success) {
      console.log('API client initialized successfully');
    } else {
      console.error('API client initialization failed');
      vscode.window.showWarningMessage('DC Artisan: API client initialization failed. Please configure the API URL.');
    }
  }).catch(error => {
    console.error('Failed to initialize API client:', error);
    vscode.window.showErrorMessage(`DC Artisan: API client initialization error: ${error.message}`);
  });

  // Register the Prompt Enhance view provider
  const promptEnhanceProvider = new PromptEnhanceProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'promptEnhance',
      promptEnhanceProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Register the RAG Pipeline view provider
  const ragPipelineProvider = new RagPipelineProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'ragPipeline',
      ragPipelineProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('dc-artisan.showPromptEnhance', () => {
      vscode.commands.executeCommand('workbench.view.extension.dc-artisan');
      vscode.commands.executeCommand('promptEnhance.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dc-artisan.showRagPipeline', () => {
      vscode.commands.executeCommand('workbench.view.extension.dc-artisan');
      vscode.commands.executeCommand('ragPipeline.focus');
    })
  );
  
  // Register API test connection command
  context.subscriptions.push(
    vscode.commands.registerCommand('dc-artisan.testApiConnection', async () => {
      try {
        vscode.window.showInformationMessage('Testing API connection...');
        const apiClient = ApiClient.getInstance();
        await apiClient.initialize();
        
        // Try to make a simple request
        try {
          const response = await apiClient.optimizePrompt('Test connection');
          vscode.window.showInformationMessage(`API connection successful! Server responded with ${response.clarifyingQuestions.length} questions.`);
        } catch (error: any) {
          vscode.window.showErrorMessage(`API request failed: ${error.message}`);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`API connection test failed: ${error.message}`);
      }
    })
  );
  
  // Register API configuration command
  context.subscriptions.push(
    vscode.commands.registerCommand('dc-artisan.configureApi', async () => {
      // Check for available servers
      const servers: {label: string, url: string}[] = [];
      
      // Check ObjectScript connection
      const objectscriptConfig = vscode.workspace.getConfiguration('objectscript');
      const conn = objectscriptConfig.get('conn') as any;
      if (conn) {
        servers.push({
          label: `ObjectScript: ${conn.host}:${conn.port}`,
          url: `${conn.protocol || 'http'}://${conn.host}:${conn.port}/artisan/api`
        });
      }
      
      // Check InterSystems Servers
      const serversConfig = vscode.workspace.getConfiguration('intersystems.servers');
      const isServers = serversConfig.get('') as Record<string, any>;
      if (isServers) {
        for (const [name, server] of Object.entries(isServers)) {
          if (server && server.webServer) {
            const { scheme, host, port } = server.webServer;
            servers.push({
              label: `InterSystems Server: ${name} (${host}:${port})`,
              url: `${scheme || 'http'}://${host}:${port}/artisan/api`
            });
          }
        }
      }
      
      // Add manual option
      servers.push({
        label: 'Enter server details manually',
        url: ''
      });
      
      // Show quick pick
      const selected = await vscode.window.showQuickPick(servers, {
        placeHolder: 'Select a server or enter details manually'
      });
      
      if (!selected) return;
      
      let apiUrl = selected.url;
      
      // If manual option was selected
      if (!apiUrl) {
        const host = await vscode.window.showInputBox({
          prompt: 'Enter IRIS host',
          placeHolder: 'localhost'
        });
        
        if (!host) return;
        
        const port = await vscode.window.showInputBox({
          prompt: 'Enter IRIS port',
          placeHolder: '52773'
        });
        
        if (!port) return;
        
        apiUrl = `http://${host}:${port}/artisan/api`;
      }
      
      const config = vscode.workspace.getConfiguration('dcArtisan');
      await config.update('apiUrl', apiUrl, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`API URL updated to: ${apiUrl}`);
    })
  );
}

export function deactivate() {}