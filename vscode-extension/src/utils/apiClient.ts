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
      // First try to load from dcArtisan config as it's most specific
      const artisanConfig = vscode.workspace.getConfiguration('dcArtisan');
      const apiUrl = artisanConfig.get('apiUrl') as string;
      
      if (apiUrl) {
        console.log(`Using API URL from dcArtisan config: ${apiUrl}`);
        this.baseUrl = apiUrl;
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
          console.log(`Using API URL from intersystems.servers: ${this.baseUrl}`);
          return true;
        }
      }
      
      // Try to load configuration from objectscript.conn
      const objectscriptConfig = vscode.workspace.getConfiguration('objectscript');
      const conn = objectscriptConfig.get('conn') as any;
      
      if (conn && conn.host && conn.port) {
        this.baseUrl = `${conn.protocol || 'http'}://${conn.host}:${conn.port}/artisan/api`;
        console.log(`Using API URL from objectscript.conn: ${this.baseUrl}`);
        return true;
      }
      
      // If no configuration found, prompt user
      return await this.promptForApiUrl();
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
      console.log('Base URL not set, initializing API client...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('API connection not initialized');
      }
    }
    
    // Validate URL format
    try {
      new URL(this.baseUrl);
    } catch (error) {
      console.error('Invalid API URL format:', this.baseUrl);
      throw new Error(`Invalid API URL: ${this.baseUrl}. Please configure a valid URL.`);
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Making ${method} request to: ${url}`);
    
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout to prevent hanging requests
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
      console.log('Request payload:', JSON.stringify(data));
    }
    
    try {
      const response = await axios(config);
      console.log('Request successful');
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Prompt Optimizer endpoints
  public async optimizePrompt(originalPrompt: string): Promise<{originalPrompt: string, clarifyingQuestions: string[]}> {
    return this.request<{originalPrompt: string, clarifyingQuestions: string[]}>('/prompt-optimizer/optimize', 'POST', {
      originalPrompt
    });
  }

  public async submitResponses(
    originalPrompt: string,
    clarifyingQuestions: string[],
    userResponses: string[]
  ): Promise<{optimizedPrompt: string; keyImprovements?: string}> {
    const response = await this.request<{improved_prompt: string; key_improvements?: string}>('/prompt-optimizer/answer', 'POST', {
      originalPrompt,
      clarifyingQuestions,
      user_responses: userResponses
    });
    
    // Map the improved_prompt to optimizedPrompt for consistency
    return { 
      optimizedPrompt: response.improved_prompt,
      keyImprovements: response.key_improvements
    };
  }

  // RAG Pipeline endpoints
  public async ingestDocument(payload: {
    document: string;
    chunkSize: string;
    collection: string;
    fileType: string;
  }): Promise<{collection: string; totalDocuments: string; error?: string}> {
    return this.request<{collection: string; totalDocuments: string; error?: string}>('/rag-pipeline/ingest', 'POST', payload);
  }

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

  public async getCollectionDocuments(collection: string): Promise<{id: string, embedding: any, document: string, metadata: any}[]> {
    return this.request<{id: string, embedding: any, document: string, metadata: any}[]>('/rag-pipeline/documents', 'POST', { collection });
  }

  public async deleteChunk(chunkId: string): Promise<void> {
    return this.request<void>(`/rag-pipeline/chunks/${chunkId}`, 'DELETE');
  }
}