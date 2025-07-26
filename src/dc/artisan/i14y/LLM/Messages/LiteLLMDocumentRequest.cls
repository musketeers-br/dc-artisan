Class dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest Extends Ens.Request
{

/// The model to use (e.g., "gemini/embedding-001", "openai/text-embedding-3-small", "azure/text-embedding-ada-002", "cohere/embed-english-v2.0")
Property EmbeddingModel As %String(MAXLEN = 100) [ InitialExpression = "text-embedding-3-small" ];

/// Namespace
Property Namespace As %String(MAXLEN = "");

/// Collection Name
Property Collection As %String(MAXLEN = "");

/// base64 Document to ingest (JSON string)
Property Document As %String(MAXLEN = "");

/// Document file type
Property FileType As %String(MAXLEN = "", VALUELIST = ",pdf,docx,text");

/// Chunk Dimension
Property ChunkSize As %Integer [ InitialExpression = 1536 ];

/// Optional parameters (JSON string)
Property Parameters As %String(MAXLEN = "");

Storage Default
{
<Data name="LiteLLMDocumentRequestDefaultData">
<Subscript>"LiteLLMDocumentRequest"</Subscript>
<Value name="1">
<Value>EmbeddingModel</Value>
</Value>
<Value name="2">
<Value>Namespace</Value>
</Value>
<Value name="3">
<Value>Collection</Value>
</Value>
<Value name="4">
<Value>Document</Value>
</Value>
<Value name="5">
<Value>FileType</Value>
</Value>
<Value name="6">
<Value>ChunkSize</Value>
</Value>
<Value name="7">
<Value>Parameters</Value>
</Value>
</Data>
<DefaultData>LiteLLMDocumentRequestDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
