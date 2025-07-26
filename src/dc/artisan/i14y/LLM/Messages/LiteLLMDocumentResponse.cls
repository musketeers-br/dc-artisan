Class dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse Extends Ens.Request
{

Property Namespace As %String(MAXLEN = "");

/// Collection Name
Property Collection As %String(MAXLEN = "");

/// Total documents in vector store (JSON string)
Property TotalDocuments As %String(MAXLEN = "");

/// Error information if the call failed (JSON string)
Property Error As %String(MAXLEN = "");

Storage Default
{
<Data name="LiteLLMDocumentResponseDefaultData">
<Subscript>"LiteLLMDocumentResponse"</Subscript>
<Value name="1">
<Value>Namespace</Value>
</Value>
<Value name="2">
<Value>Collection</Value>
</Value>
<Value name="3">
<Value>TotalDocuments</Value>
</Value>
<Value name="4">
<Value>Error</Value>
</Value>
</Data>
<DefaultData>LiteLLMDocumentResponseDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
