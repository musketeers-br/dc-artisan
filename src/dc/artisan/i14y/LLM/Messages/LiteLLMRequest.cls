Class dc.artisan.i14y.LLM.Messages.LiteLLMRequest Extends Ens.Request
{

/// The model to use (e.g., "gpt-4", "claude-2")
Property Model As %String(MAXLEN = 100);

/// The messages array following OpenAI's format (JSON string)
Property Messages As %String(MAXLEN = "");

/// Optional parameters (JSON string)
Property Parameters As %String(MAXLEN = "");

/// Helper method to add a message
Method AddMessage(role As %String, content As %String) As %Status
{
    Try {
        // Initialize messages array if empty
        If ..Messages = "" {
            Set ..Messages = "[]"
        }
        
        // Parse existing messages
        Set tMessages = [].%FromJSON(..Messages)
        
        // Add new message
        Set tMessage = {"role":(role), "content":(content)}
        Do tMessages.%Push(tMessage)
        
        // Store back as JSON string
        Set ..Messages = tMessages.%ToJSON()
        Return $$$OK
    }
    Catch e {
        Return e.AsStatus()
    }
}

Storage Default
{
<Data name="LiteLLMRequestDefaultData">
<Subscript>"LiteLLMRequest"</Subscript>
<Value name="1">
<Value>Model</Value>
</Value>
<Value name="2">
<Value>Messages</Value>
</Value>
<Value name="3">
<Value>Parameters</Value>
</Value>
</Data>
<DefaultData>LiteLLMRequestDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
