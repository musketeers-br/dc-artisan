Class dc.artisan.i14y.LLM.Adapter.LiteLLMAdapter Extends Ens.OutboundAdapter
{

/// Controls which properties are visible in the production settings UI
Parameter SETTINGS = "APIKeysConfig:Basic:textarea?rows=5&cols=50,BaseURL,Timeout,DefaultModel,MaxRetries,RetryDelay";

/// JSON configuration for API keys in LiteLLM format
/// Example: {"OPENAI_API_KEY":"sk-...","ANTHROPIC_API_KEY":"sk-ant-...","COHERE_API_KEY":"..."}
Property APIKeysConfig As %String(MAXLEN = "");

/// Base URL for LiteLLM API (optional - for proxy mode)
Property BaseURL As %String;

/// Timeout for API calls (in seconds)
Property Timeout As %Numeric [ InitialExpression = 30 ];

/// Default model to use if not specified in request
Property DefaultModel As %String [ InitialExpression = "openai/o4-mini" ];

/// Maximum retry attempts for failed calls
Property MaxRetries As %Integer [ InitialExpression = 0 ];

/// Retry delay in seconds between attempts
Property RetryDelay As %Numeric [ InitialExpression = 1 ];

/// Python lib for OS interaction
Property os As %SYS.Python [ Private ];

/// Python lib for JSON handling
Property json As %SYS.Python [ Private ];

/// Python lib for interacting with LiteLLM services
Property litellm As %SYS.Python [ Private ];

Property vector As %SYS.Python [ Private ];

/// from langchain_iris import IRISVector
Method OnInit() As %Status
{
    Set tSC = $$$OK
    Try {
        // Load Python libraries
        Set ..os = ##class(%SYS.Python).Import("os")
        Set ..json = ##class(%SYS.Python).Import("json")
        Set ..litellm = ##class(%SYS.Python).Import("litellm")

        // Set API keys from configuration
        If ..APIKeysConfig '= "" {
            Try {
                Set tKeyConfig = {}.%FromJSON(..APIKeysConfig)
            } Catch(e) {
                Throw ##class(%Exception.General).%New("Error on parsing APIKeysConfig config. As this parameter expects a valid JSON, please check if the provided value is a valid one.")
            }
            Set tKeyIter = tKeyConfig.%GetIterator()
            While tKeyIter.%GetNext(.tKeyName, .tKeyValue) {
                Do ..os.environ."__setitem__"(tKeyName, tKeyValue)
            }
        }
        
        $$$LOGINFO("LiteLLM Adapter initialized successfully")
    } Catch e {
        Set tSC = e.AsStatus()
        $$$LOGERROR("Failed to initialize LiteLLM Adapter: "_$System.Status.GetOneErrorText(tSC))
    }
    Quit tSC
}

Method GetLiteLLMInstance(pRequest As dc.artisan.i14y.LLM.Messages.LiteLLMRequest) As %SYS.Python
{
    If (pRequest.%IsA("tests.dc.artisan.unittests.i14y.LiteLLMRequestMock")) {
        Return ##class(tests.dc.artisan.unittests.i14y.LiteLLMMock).%New()
    }
    Return ..litellm
}

Method CallLiteLLM(pRequest As dc.artisan.i14y.LLM.Messages.LiteLLMRequest, Output pResponse As dc.artisan.i14y.LLM.Messages.LiteLLMResponse) As %Status
{
    Set tSC = $$$OK
    Set tAttempt = 0

    Set pResponse = ##class(dc.artisan.i14y.LLM.Messages.LiteLLMResponse).%New()
    Set litellm = ..GetLiteLLMInstance(pRequest)
    
    While tAttempt <= ..MaxRetries {
        Set tAttempt = tAttempt + 1
        
        Try {
            // Call LiteLLM
            Set model = $Select(pRequest.Model '= "": pRequest.Model, 1: ..GetDefaultModel())
            Set messages = ..json.loads(pRequest.Messages)
            Set tResponse = litellm.completion(model, messages)
        
            // Map to our response object
            Set pResponse.Model = tResponse.model
            Set choices = []
            For i=0:1:tResponse.choices."__len__"()-1 {
                Do choices.%Push({}.%FromJSON(tResponse.choices."__getitem__"(0)."to_json"()))
            }
            Set pResponse.Choices = choices.%ToJSON()
            Set pResponse.Usage = {}.%FromJSON(tResponse.usage."to_json"()).%ToJSON()
            If ..hasattr(tResponse, "error") {
                Set pResponse.Error = {}.%FromJSON(tResponse.error."to_json"()).%ToJSON()
            }
        } Catch e {
            Set tSC = e.AsStatus()
            
            // Log the error
            $$$LOGERROR("LiteLLM call attempt "_tAttempt_" failed: "_$System.Status.GetOneErrorText(tSC))
            
            // If we've reached max retries, quit
            If tAttempt > ..MaxRetries Quit
            
            // Wait before retrying
            Hang ..RetryDelay
        }
    }
    
    If ($$$ISERR(tSC)) {
        Set pResponse.Error = {
            "message": "All LiteLLM call attempts failed",
            "details": ($System.Status.GetOneErrorText(tSC))
        }.%ToJSON()
    }
    
    Quit tSC
}

Method CallLiteLLMDocumentIngest(pRequest As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest, Output pResponse As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse) As %Status
{
    Set tSC = $$$OK
    Try {
        Set output = ..DocumentIngest(pRequest.EmbeddingModel, pRequest.Collection, pRequest.Document, pRequest.FileType, pRequest.ChunkSize)
        Set json = {}.%FromJSON(output)
    
        If (json.%Get("error","")'="") {
            Set pResponse.Error = json.error.%ToJSON()
            Return ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, pResponse.Error ))
        }
        Set pResponse.Collection = pRequest.Collection
        Set pResponse.TotalDocuments = json.%Get("total_documents", 0)
    } Catch ex {
        Set tSC = ex.AsStatus()
        Set pResponse.Error = {
            "message": "All LiteLLM call attempts failed",
            "details": ($System.Status.GetOneErrorText(tSC))
        }.%ToJSON()
    }
    
    Return tSC
}

ClassMethod DocumentIngest(embeddingModel As %String, collection As %String, base64Content As %String, fileType As %String, chunkSize As %Integer) As %String [ Language = python ]
{
    import json
    import os
    from langchain_iris import IRISVector
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_core.embeddings import Embeddings
    from langchain_core.documents import Document
    import litellm
    import iris
    from typing import List

    class LiteLLMEmbeddings(Embeddings):
        def __init__(self, model: str = "text-embedding-3-small" ):
            self.model = model
        
        def embed_documents(self, texts: List[str]) -> List[List[float]]:
            response = litellm.embedding(model=self.model, input=texts)
            return [item['embedding'] for item in response['data']]
        
        def embed_query(self, text: str) -> List[float]:
            response = litellm.embedding(model=self.model, input=[text])
            return response['data'][0]['embedding']

    try:
        # Create a Document object from the string
        docs = iris.cls(__name__).DocumentLoader(base64Content, fileType)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunkSize, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        vectorstore = IRISVector.from_documents(
            documents=splits,
            embedding=LiteLLMEmbeddings(model=embeddingModel),
            dimension=1536,
            collection_name=collection,
        )

        output = {
            "status": True,
            "collection_name": collection,
            "total_documents": len(vectorstore.get()['ids'])
        }

        return json.dumps(output)
    except Exception as err:
        return json.dumps({"error": str(err)})
}

ClassMethod DocumentLoader(pBase64 As %String, fileType As %String) As %SYS.Python [ Language = python ]
{
    import base64
    import tempfile
    import os
    from langchain_community.document_loaders import (
        TextLoader, PyPDFLoader, Docx2txtLoader, UnstructuredRTFLoader
    )
    
    # Decode base64 content
    file_content = base64.b64decode(pBase64)
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{fileType}') as temp_file:
        temp_file.write(file_content)
        temp_path = temp_file.name
    
    try:
        # Select appropriate loader based on file type
        if fileType.lower() in ['txt', 'md', 'markdown']:
            loader = TextLoader(temp_path)
        elif fileType.lower() == 'pdf':
            loader = PyPDFLoader(temp_path)
        elif fileType.lower() == 'docx':
            loader = Docx2txtLoader(temp_path)
        elif fileType.lower() == 'rtf':
            loader = UnstructuredRTFLoader(temp_path)
        else:
            raise ValueError(f"Unsupported file type: {fileType}")
        
        # Load documents
        documents = loader.load()
        return documents
    except ZeroDivisionError as e:
        print(f"An error occurred: {e}")
        
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.unlink(temp_path)
}

ClassMethod hasattr(obj As %SYS.Python, attr As %String) [ Language = python ]
{
    return hasattr(obj, attr)
}

Method GetDefaultModel() As %String
{
    Return ##class(dc.artisan.i14y.Utils).ResolveModelValue(..DefaultModel)
}

}
