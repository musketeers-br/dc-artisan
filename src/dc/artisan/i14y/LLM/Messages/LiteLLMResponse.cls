Class dc.artisan.i14y.LLM.Messages.LiteLLMResponse Extends Ens.Response
{

/// The model used for generation
Property Model As %String(MAXLEN = 100);

/// The generated completions (JSON string)
Property Choices As %String(MAXLEN = "");

/// Token usage statistics (JSON string)
Property Usage As %String(MAXLEN = "");

/// Error information if the call failed (JSON string)
Property Error As %String(MAXLEN = "");

/// Helper method to get the first completion text
Method GetFirstCompletion() As %String
{
    Try {
        If ..Choices = "" {
            Return ""
        }
        
        Set tChoices = [].%FromJSON(..Choices)
        If tChoices.%Size() > 0 {
            Return tChoices.%Get(0).message.content
        }
        Return ""
    }
    Catch e {
        Return ""
    }
}

Storage Default
{
<Data name="LiteLLMResponseDefaultData">
<Subscript>"LiteLLMResponse"</Subscript>
<Value name="1">
<Value>Model</Value>
</Value>
<Value name="2">
<Value>Choices</Value>
</Value>
<Value name="3">
<Value>Usage</Value>
</Value>
<Value name="4">
<Value>Error</Value>
</Value>
</Data>
<DefaultData>LiteLLMResponseDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
