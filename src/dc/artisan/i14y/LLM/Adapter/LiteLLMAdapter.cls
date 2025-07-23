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
Property DefaultModel As %String [ InitialExpression = "o4-mini" ];

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

ClassMethod hasattr(obj As %SYS.Python, attr As %String) [ Language = python ]
{
    return hasattr(obj, attr)
}

Method GetDefaultModel() As %String
{
    Return ##class(dc.artisan.i14y.Utils).ResolveModelValue(..DefaultModel)
}

}
