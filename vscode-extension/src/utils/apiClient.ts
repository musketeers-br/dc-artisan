import * as vscode from 'vscode';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string = '';

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public async initialize(): Promise<boolean> {
    try {
      // Try to load configuration from objectscript.conn
      const objectscriptConfig = vscode.workspace.getConfiguration('objectscript');
      const conn = objectscriptConfig.get('conn') as any;
      
      if (conn) {
        this.baseUrl = `${conn.protocol || 'http'}://${conn.host}:${conn.port}/artisan/api`;
        return true;
      } 
      
      // Try to load configuration from intersystems.servers
      const serversConfig = vscode.workspace.getConfiguration('intersystems.servers');
      const servers = serversConfig.get('') as Record<string, any>;
      
      if (servers && Object.keys(servers).length > 0) {
        // Use the first server in the list
        const serverName = Object.keys(servers)[0];
        const server = servers[serverName];
        
        if (server && server.webServer) {
          const { scheme, host, port } = server.webServer;
          this.baseUrl = `${scheme || 'http'}://${host}:${port}/artisan/api`;
          return true;
        }
      }
      
      // If no server configurations found, try dcArtisan config
      const artisanConfig = vscode.workspace.getConfiguration('dcArtisan');
      const apiUrl = artisanConfig.get('apiUrl') as string;
      
      if (apiUrl) {
        this.baseUrl = apiUrl;
        return true;
      } else {
        // If no configuration found, prompt user
        return await this.promptForApiUrl();
      }
    } catch (error) {
      console.error('Error initializing API client:', error);
      return false;
    }
  }

  private async promptForApiUrl(): Promise<boolean> {
    const host = await vscode.window.showInputBox({
      prompt: 'Enter IRIS host',
      placeHolder: 'localhost'
    });
    
    if (!host) return false;
    
    const port = await vscode.window.showInputBox({
      prompt: 'Enter IRIS port',
      placeHolder: '52773'
    });
    
    if (!port) return false;
    
    this.baseUrl = `http://${host}:${port}/artisan/api`;
    
    // Save to settings
    const config = vscode.workspace.getConfiguration('dcArtisan');
    await config.update('apiUrl', this.baseUrl, vscode.ConfigurationTarget.Global);
    
    return true;
  }

  public async request<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    if (!this.baseUrl) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('API connection not initialized');
      }
    }
    
    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error.message);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Prompt Optimizer endpoints
  public async optimizePrompt(originalPrompt: string): Promise<{originalPrompt: string, clarifyingQuestions: string[]}> {
    return this.request<{originalPrompt: string, clarifyingQuestions: string[]}>('/prompt-optimizer/optimize', 'POST', {
      originalPrompt
    });
  }

  public async submitResponses(responses: string[]): Promise<{optimizedPrompt: string}> {
    return this.request<{optimizedPrompt: string}>('/prompt-optimizer/answer', 'POST', {
      responses
    });
  }

  // RAG Pipeline endpoints
  public async uploadDocument(fileData: Buffer, fileName: string): Promise<any> {
    const form = new FormData();
    form.append('file', fileData, fileName);
    
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.baseUrl}/rag-pipeline/upload`,
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      data: form
    };
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('Document upload failed:', error.message);
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  public async listDocuments(): Promise<{id: string, name: string}[]> {
    return this.request<{id: string, name: string}[]>('/rag-pipeline/documents');
  }

  public async deleteDocument(documentId: string): Promise<void> {
    return this.request<void>(`/rag-pipeline/documents/${documentId}`, 'DELETE');
  }

  public async getDocumentChunks(documentId: string): Promise<{chunkId: string, content: string}[]> {
    return this.request<{chunkId: string, content: string}[]>(`/rag-pipeline/documents/${documentId}/chunks`);
  }
}