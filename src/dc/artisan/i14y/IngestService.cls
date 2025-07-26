Class dc.artisan.i14y.IngestService Extends Ens.BusinessService
{

Parameter ADAPTER;

Property LLMModel As %String [ Internal, Private ];

Method GetLLMModel() As %String
{
    If ..LLMModel = "" {
        Set ..LLMModel = ##class(dc.artisan.i14y.Utils).ResolveModelValue(
            ..GetProductionSettingValue("LLMModel")
        )
        If ..LLMModel = "" {
            Throw ##class(%Exception.General).%New("LLM Model undefined.")
        }
        $$$LOGINFO("LLM Model: "_..LLMModel)
    }

	Quit ..LLMModel
}

Method OnProcessInput(pInput As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest, Output pOutput As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse) As %Status
{
    Try {
        // Validate input
        If '$IsObject(pInput) {
            Return $$$ERROR($$$GeneralError, "Invalid input request")
        }
        
        // Forward to Business Process
        Set sc = ..SendRequestSync("IngestProcess", pInput, .pOutput)
        
        If $$$ISERR(sc) || '$IsObject(pOutput) {
            Return $$$ERROR($$$GeneralError, "Business Process failed: "_$System.Status.GetErrorText(sc))
        }
        
        Return $$$OK
        
    } Catch ex {
        Return ex.AsStatus()
    }
}

}
