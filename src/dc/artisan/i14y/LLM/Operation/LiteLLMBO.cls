Class dc.artisan.i14y.LLM.Operation.LiteLLMBO Extends Ens.BusinessOperation
{

Parameter ADAPTER = "dc.artisan.i14y.LLM.Adapter.LiteLLMAdapter";

Property Adapter As dc.artisan.i14y.LLM.Adapter.LiteLLMAdapter;

Parameter INVOCATION = "Queue";

/// Call LLM using LiteLLM-compatible messages via the adapter
Method CallLiteLLM(pRequest As dc.artisan.i14y.LLM.Messages.LiteLLMRequest, Output pResponse As dc.artisan.i14y.LLM.Messages.LiteLLMResponse) As %Status
{
    Set tSC = $$$OK
    
    Try {
        // Create response object
        Set pResponse = ##class(dc.artisan.i14y.LLM.Messages.LiteLLMResponse).%New()
        
        // Call the adapter
        Set tSC = ..Adapter.CallLiteLLM(pRequest, .pResponse)
        If $$$ISERR(tSC) Quit
    }
    Catch e {
        Set tSC = e.AsStatus()
        Set pResponse.Error = {"code":500, "message":($System.Status.GetOneErrorText(tSC))}.%ToJSON()
    }
    
    Quit tSC
}

/// Call LLM using LiteLLM-compatible messages via the adapter
Method CallLiteLLMDocumentIngest(pRequest As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest, Output pResponse As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse) As %Status
{
    Set tSC = $$$OK
    
    Try {
        // Create response object
        Set pResponse = ##class(dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse).%New()
        
        // Call the adapter
        Set tSC = ..Adapter.CallLiteLLMDocumentIngest(pRequest, .pResponse)
        If $$$ISERR(tSC) Quit
    }
    Catch e {
        Set tSC = e.AsStatus()
        Set pResponse.Error = {"code":500, "message":($System.Status.GetOneErrorText(tSC))}.%ToJSON()
    }
    
    Quit tSC
}

XData MessageMap
{
<MapItems>
    <MapItem MessageType="dc.artisan.i14y.LLM.Messages.LiteLLMRequest">
        <Method>CallLiteLLM</Method>
    </MapItem>

    <MapItem MessageType="dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest">
        <Method>CallLiteLLMDocumentIngest</Method>
    </MapItem>
</MapItems>
}

}
