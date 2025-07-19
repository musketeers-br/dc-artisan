import * as vscode from 'vscode';
import axios, { AxiosRequestConfig } from 'axios';

export class IRISConnector {
  private static instance: IRISConnector;
  private baseUrl: string = '';
  private username: string = '';
  private password: string = '';

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): IRISConnector {
    if (!IRISConnector.instance) {
      IRISConnector.instance = new IRISConnector();
    }
    return IRISConnector.instance;
  }

  public async initialize(): Promise<boolean> {
    try {
      // Try to load configuration from objectscript.conn
      const config = vscode.workspace.getConfiguration('objectscript');
      const conn = config.get('conn') as any;
      
      if (conn) {
        this.baseUrl = `${conn.protocol || 'http'}://${conn.host}:${conn.port}`;
        this.username = conn.username;
        this.password = conn.password;
        return true;
      } else {
        // If no configuration found, prompt user
        return await this.promptForCredentials();
      }
    } catch (error) {
      console.error('Error initializing IRIS connector:', error);
      return false;
    }
  }

  private async promptForCredentials(): Promise<boolean> {
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
    
    const username = await vscode.window.showInputBox({
      prompt: 'Enter IRIS username',
      placeHolder: 'SuperUser'
    });
    
    if (!username) return false;
    
    const password = await vscode.window.showInputBox({
      prompt: 'Enter IRIS password',
      password: true
    });
    
    if (!password) return false;
    
    this.baseUrl = `http://${host}:${port}`;
    this.username = username;
    this.password = password;
    
    return true;
  }

  public async request<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    if (!this.baseUrl) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('IRIS connection not initialized');
      }
    }
    
    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      auth: {
        username: this.username,
        password: this.password
      },
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
      console.error('IRIS API request failed:', error.message);
      throw new Error(`IRIS API request failed: ${error.message}`);
    }
  }

  // Document management methods
  public async uploadDocument(file: Uint8Array, filename: string, namespace: string): Promise<any> {
    const formData = new FormData();
    const blob = new Blob([file], { type: 'application/octet-stream' });
    formData.append('file', blob, filename);
    formData.append('namespace', namespace);
    
    return this.request<any>('/api/rag/documents', 'POST', formData);
  }

  public async listDocuments(namespace: string): Promise<any[]> {
    return this.request<any[]>(`/api/rag/documents?namespace=${namespace}`);
  }

  public async deleteDocument(documentId: string): Promise<void> {
    return this.request<void>(`/api/rag/documents/${documentId}`, 'DELETE');
  }

  // Embedding operations
  public async getEmbeddings(namespace: string): Promise<any[]> {
    return this.request<any[]>(`/api/rag/embeddings?namespace=${namespace}`);
  }

  public async updateEmbedding(embeddingId: string, data: any): Promise<any> {
    return this.request<any>(`/api/rag/embeddings/${embeddingId}`, 'PUT', data);
  }

  public async copyEmbeddings(sourceNamespace: string, targetNamespace: string): Promise<any> {
    return this.request<any>('/api/rag/embeddings/copy', 'POST', {
      sourceNamespace,
      targetNamespace
    });
  }

  // RAG operations
  public async queryDocuments(query: string, namespace: string): Promise<any> {
    return this.request<any>('/api/rag/query', 'POST', {
      query,
      namespace
    });
  }

  public async analyzeCorpus(namespace: string): Promise<any> {
    return this.request<any>(`/api/rag/analyze?namespace=${namespace}`);
  }
}