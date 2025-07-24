Class dc.artisan.i14y.OptimizerProcess Extends Ens.BusinessProcess
{

Method OnRequest(pRequest As dc.artisan.i14y.Messages.Request, Output pResponse As dc.artisan.i14y.Messages.Response) As %Status
{
    #dim ex As %Exception.AbstractException
    #dim llmRequest As dc.artisan.i14y.LLM.Messages.LiteLLMRequest
    #dim llmResponse As dc.artisan.i14y.LLM.Messages.LiteLLMResponse

    Set tSC = $$$OK
    
    Try {
        Set bundle = {}.%FromJSON(pRequest.Bundle)
        Set prompt = ..GetPromptQuestions(bundle.originalPrompt)
        $$$ThrowOnError(..CallLiteLLM(prompt, pRequest.Model, .llmResponse))
        Set response = llmResponse.GetFirstCompletion()

        Set lst = $ListFromString(response,$Char(10))
        Set output = {"originalPrompt": (bundle.originalPrompt)}
        Set questions = []
        Set pointer= 0
        While $ListNext(lst, pointer, value) {
            Do questions.%Push(value)
        }
        Set output.clarifyingQuestions = questions

        // Create and populate the response
        Set pResponse = ##class(dc.artisan.i14y.Messages.Response).%New()
        Set pResponse.Result = output.%ToJSON()
    } Catch ex {
        Set tSC = $$$ERROR($$$GeneralError,"Error in Process: "_ex.DisplayString()_" at "_ex.Location)
    }

    Return tSC
}

Method CallLiteLLM(pPrompt As %String, pModel As %String, Output pResponse As %Library.Persistent, pTimeout As %Integer = 30) As %Status
{
    Set tSC = $$$OK
	Try {
        // Create and configure the LLM request
        Set llmRequest = ##class(dc.artisan.i14y.LLM.Messages.LiteLLMRequest).%New()
        Set llmRequest.Model = pModel
	
        // Add the message using the helper method
        Set sc = llmRequest.AddMessage("user", pPrompt)
        If $$$ISERR(sc) {
            Return $$$ERROR($$$GeneralError, "Failed to construct LLM request: "_$System.Status.GetErrorText(sc))
        }
        
        // Optional: Set parameters if needed
        Set llmRequest.Parameters = {"temperature":0.7, "max_tokens":2000}.%ToJSON()
        
        // Call the LLM Business Operation
        Set sc = ..SendRequestSync("LLMService", llmRequest, .pResponse, pTimeout)
        If $$$ISERR(sc) {
            Return $$$ERROR($$$GeneralError, "Failed to call LLM service: "_$System.Status.GetErrorText(sc))
        }
        If '$IsObject(pResponse) {
            Return $$$ERROR($$$GeneralError, "No response received from LLM service")
        }
        
        // Check for LLM errors
        If pResponse.Error '= "" {
            Set errorInfo = {}.%FromJSON(pResponse.Error)
            Return $$$ERROR($$$GeneralError, "LLM error: "_$Get(errorInfo.message, "Unknown error"))
        }
	} Catch tException {
		Set:$$$ISOK(tSC) tSC = tException.AsStatus()
	}
    Return tSC
}

Method GetPromptQuestions(userPrompt As %String) As %String
{
    Set prompt = "# ROLE AND GOAL "_$c(10)_
        "You are an expert Prompt Engineer. Your task is to analyze an initial user prompt and identify areas that lack clarity, "_$c(10)_
        " context, or detail. Based on this analysis, your sole objective is to formulate a list of specific, "_$c(10)_
        " clarifying questions that will help the user refine their idea. Do not write the final prompt yet. "_$c(10)_
        "# ANALYSIS FRAMEWORK "_$c(10)_
        "Analyze the user's prompt based on these key criteria: "_$c(10)_
        "1.  **Core Objective:** What is the primary goal or output the user wants to create? "_$c(10)_
        "2.  **Target Audience:** Who is the final output for? "_$c(10)_
        "3.  **Format & Structure:** How should the output be structured (e.g., list, table, essay, code)? "_$c(10)_
        "4.  **Tone & Style:** What is the desired tone (e.g., formal, casual, technical, creative)? "_$c(10)_
        "5.  **Context & Constraints:** What background information is necessary? What should be included or explicitly excluded? "_$c(10)_
        "# INSTRUCTIONS "_$c(10)_
        "1.  Receive the user's initial prompt provided below in `User Prompt`. "_$c(10)_
        "2.  Silently analyze it using the framework above. "_$c(10)_
        "3.  Generate a numbered list of questions to gather the missing information. "_$c(10)_
        "4.  Your response must be ONLY Your questions. "_$c(10)_
        "# USER PROMPT  "_$c(10)_
        userPrompt
    
    Return prompt
}

Storage Default
{
<Type>%Storage.Persistent</Type>
}

}
