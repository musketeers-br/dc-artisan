Class dc.artisan.i14y.AnswerProcess Extends Ens.BusinessProcess
{

Method OnRequest(pRequest As dc.artisan.i14y.Messages.Request, Output pResponse As dc.artisan.i14y.Messages.Response) As %Status
{
    #dim ex As %Exception.AbstractException
    #dim llmRequest As dc.artisan.i14y.LLM.Messages.LiteLLMRequest
    #dim llmResponse As dc.artisan.i14y.LLM.Messages.LiteLLMResponse

    Set tSC = $$$OK
    
    Try {
        Set bundle = {}.%FromJSON(pRequest.Bundle)
        Set questions = ""
        Set:(bundle.clarifyingQuestions'="") questions = bundle.clarifyingQuestions.%ToJSON()
        Set answers = ""
        Set:(bundle.%Get("user_responses")'="") answers = bundle."user_responses".%ToJSON()
        Set prompt = ..GetPromptImprovedVersion(bundle.originalPrompt, questions, answers)
        $$$ThrowOnError(..CallLiteLLM(prompt, pRequest.Model, .llmResponse))
        Set resp = llmResponse.GetFirstCompletion()
        Set lst = $ListFromString(resp,"Key Improvements:")
        Set response = $Replace($List(lst,1), "# Final Prompt:", "")
        Set keyImprovements = $List(lst,2)
        Set output = {"originalPrompt": (bundle.originalPrompt),
            "clarifyingQuestions": (bundle.clarifyingQuestions),
            "user_responses": (bundle."user_responses"),
            "improved_prompt": (response),
            "key_improvements": (keyImprovements)
        }

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

Method GetPromptImprovedVersion(originalPrompt As %String, clarifyingQuestions As %String, userAnswers As %String) As %String
{
    Set prompt = "# ROLE AND GOAL "_$c(10)_
        "You are an expert Prompt Engineer. "_
        "Your task is to create a final, optimized, and comprehensive prompt based on an initial idea, "_
        "a set of clarifying questions, and the user's answers to those questions. "_$c(10)_
        "# CONTEXT "_$c(10)_
        "You will be given three pieces of information: "_$c(10)_
        "1.  `Original Prompt`: The user's initial, often vague, idea. "_$c(10)_
        "2.  `Clarifying Questions`: The questions you (the AI) previously asked to get more detail. "_$c(10)_
        "3.  `User Answers`: The user's responses to your questions. "_$c(10)_
        "# INSTRUCTIONS "_$c(10)_
        "1.  Carefully review all three pieces of information provided below. "_$c(10)_
        "2.  Synthesize the user's original goal with the specific details from their answers."_$c(10)_
        "3.  Construct a single, highly effective, and detailed final prompt that incorporates all the user's requirements. "_
            "The final prompt should be clear, specific, and ready to be used."_$c(10)_
        "4. Add a brief, bulleted list titled 'Key Improvements' "_
            "explaining why this new prompt is more effective than the original."_$c(10)_
        "# PROVIDED INFORMATION "_$c(10)_
        "## Original Prompt: "_$c(10)_
        originalPrompt _""_$c(10)_
        "## Clarifying Questions: "_$c(10)_
        clarifyingQuestions _""_$c(10)_
        "## User's Answers: "_$c(10)_
        userAnswers
    
    Return prompt
}

Storage Default
{
<Type>%Storage.Persistent</Type>
}

}
