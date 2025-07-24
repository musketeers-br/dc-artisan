Class dc.artisan.i14y.OptimizerService Extends Ens.BusinessService
{

/// An adapaterless BS
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

Method OnProcessInput(pInput As dc.artisan.i14y.Messages.Request, Output pOutput As dc.artisan.i14y.Messages.Response) As %Status
{
    Try {
        // Validate input
        If '$IsObject(pInput) || (pInput.Bundle = "") {
            Return $$$ERROR($$$GeneralError, "Invalid input request")
        }
        
        // Forward to Business Process
        Set bpRequest = ##class(dc.artisan.i14y.Messages.Request).%New()
        Set bpRequest.Bundle = pInput.Bundle
        Set bpRequest.Model = pInput.Model
        Set:(bpRequest.Model="") bpRequest.Model = "openai/gpt-4o"
        Set sc = ..SendRequestSync("OptimizerProcess", bpRequest, .bpResponse)
        
        If $$$ISERR(sc) || '$IsObject(bpResponse) {
            Return $$$ERROR($$$GeneralError, "Business Process failed: "_$System.Status.GetErrorText(sc))
        }
        
        // Return final response
        Set pOutput = ##class(dc.artisan.i14y.Messages.Response).%New()
        Set pOutput.Result = bpResponse.Result
        Return $$$OK
        
    } Catch ex {
        Return ex.AsStatus()
    }
}

}
