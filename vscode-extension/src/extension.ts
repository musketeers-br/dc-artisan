import * as vscode from 'vscode';
import { PromptEnhanceProvider } from './views/promptEnhance/promptEnhanceProvider';
import { RagPipelineProvider } from './views/ragPipeline/ragPipelineProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('DC Artisan extension is now active');

  // Register the Prompt Enhance view provider
  const promptEnhanceProvider = new PromptEnhanceProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'promptEnhance',
      promptEnhanceProvider
    )
  );

  // Register the RAG Pipeline view provider
  const ragPipelineProvider = new RagPipelineProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'ragPipeline',
      ragPipelineProvider
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
}

export function deactivate() {}