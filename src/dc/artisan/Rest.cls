Class dc.artisan.Rest Extends %CSP.REST
{

Parameter HandleCorsRequest = "true";

/// By default convert the input stream to Unicode
Parameter CONVERTINPUTSTREAM = 1;

/// The default response charset is utf-8
Parameter CHARSET = "utf-8";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
    <!-- Prompt Optimization -->
    <Route Url="/prompt-optimizer/optimize" Method="post" Call="Optimize" />
    <Route Url="/prompt-optimizer/answer" Method="post" Call="Answer" />
    <Route Url="/prompt-optimizer/test" Method="post" Call="TestPrompt" />
    <!--RAG Operations -->
    <Route Url="/rag-pipeline/ingest" Method="post" Call="Ingest" />
    <Route Url="/rag-pipeline/documents/:collection/:chunkId" Method="delete" Call="ChunkDelete" />
    <Route Url="/rag-pipeline/documents" Method="post" Call="Documents" />
</Routes>
}

ClassMethod Optimize() As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("application/json")

        // Get Business Service instance
        Set sc = ##class(Ens.Director).CreateBusinessService("OptimizerService", .businessService)
        If $$$ISERR(sc) || '$IsObject(businessService) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Service unavailable"))
        }

        Set userPrompt=##class(%DynamicAbstractObject).%FromJSON(%request.Content)

        // Create request object
        Set request = ##class(dc.artisan.i14y.Messages.Request).%New()
        Set request.Bundle = userPrompt.%ToJSON()

        // Process request
        Set sc = businessService.ProcessInput(request, .response)
        If $$$ISERR(sc) || '$IsObject(response) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Processing error"))
        }

        Do ##class(%REST.Impl).%WriteResponse({}.%FromJSON(response.Result))

    } Catch (ex) {
        Set tSC=ex.AsStatus()
    }
    Return $$$OK
}

ClassMethod Answer() As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("application/json")

        // Get Business Service instance
        Set sc = ##class(Ens.Director).CreateBusinessService("AnswerService", .businessService)
        If $$$ISERR(sc) || '$IsObject(businessService) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Service unavailable"))
        }

        Set userAnswers=##class(%DynamicAbstractObject).%FromJSON(%request.Content)

        // Create request object
        Set request = ##class(dc.artisan.i14y.Messages.Request).%New()
        Set request.Bundle = userAnswers.%ToJSON()

        /*
        Given the original prompt:\n{current_prompt}\n
        And the user answers so far:\n{user_responses}\n
        Give a improved optimized prompt
        */
        // Process request
        Set sc = businessService.ProcessInput(request, .response)
        If $$$ISERR(sc) || '$IsObject(response) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Processing error"))
        }

        Do ##class(%REST.Impl).%WriteResponse({}.%FromJSON(response.Result))

    } Catch (ex) {
        Set tSC=ex.AsStatus()
    }
    Return $$$OK
}

ClassMethod Ingest() As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("application/json")

        // Get Business Service instance
        Set sc = ##class(Ens.Director).CreateBusinessService("IngestService", .businessService)
        If $$$ISERR(sc) || '$IsObject(businessService) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Service unavailable"))
        }

        Set json=##class(%DynamicAbstractObject).%FromJSON(%request.Content)

        // Create request object
        Set request = ##class(dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest).%New()
        Set request.Document = json.document
        Set request.ChunkSize = json.chunkSize
        Set request.Collection = json.collection
        Set request.FileType = json.fileType
        Set request.Namespace = $NAMESPACE // Next version get namespace from user
        // Process request
        Set sc = businessService.ProcessInput(request, .response)
        If $$$ISERR(sc) || '$IsObject(response) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Processing error"))
        }

        #dim response As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse
        Do ##class(%REST.Impl).%WriteResponse({"collection": (response.Collection), "totalDocuments": (response.TotalDocuments), "error": (response.Error)}.%ToJSON())

    } Catch (ex) {
        Set tSC=ex.AsStatus()
    }
    Return $$$OK
}

ClassMethod Documents() As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("application/json")

        Set sc = ##class(Ens.Director).CreateBusinessService("DocumentsService", .businessService)
        If $$$ISERR(sc) || '$IsObject(businessService) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Service unavailable"))
        }
        Set json=##class(%DynamicAbstractObject).%FromJSON(%request.Content)

        Set request = ##class(dc.artisan.i14y.Messages.DocumentsReq).%New()
        Set request.Name = json.collection
        Set sc = businessService.ProcessInput(request, .response)
        Do ##class(%REST.Impl).%WriteResponse({}.%FromJSON(response.Result))
    } Catch (ex) {
        Set tSC=ex.AsStatus()
    }
    Return $$$OK
}

ClassMethod ChunkDelete(Collection As %String, ChunkId As %String) As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("application/json")

        Set sc = ##class(Ens.Director).CreateBusinessService("DocumentExService", .businessService)
        If $$$ISERR(sc) || '$IsObject(businessService) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Service unavailable"))
        }

        Set request = ##class(dc.artisan.i14y.Messages.ChunkDeleteReq).%New()
        Set request.Name = Collection
        Set request.ChunkId = ChunkId
        Set sc = businessService.ProcessInput(request, .response)
    } Catch (ex) {
        Set tSC=ex.AsStatus()
    }
    Return $$$OK
}

ClassMethod TestPrompt() As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("text/html")
        Set requestContent = ##class(%DynamicAbstractObject).%FromJSON(%request.Content)

        Set resp = ##class(dc.artisan.PromptEvaluation).GetLLM(requestContent.provider)
        Set llm = resp."__getitem__"(0)
        Set evaluatorLLM = resp."__getitem__"(1)
        If '$IsObject(llm) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "LLM provider not found"))
        }

        // todo: let users select provider and metrics in the extension
        Set evalMetrics = ##class(dc.artisan.PromptEvaluation).GetEvaluationMetrics(evaluatorLLM)
        If '$IsObject(evalMetrics) {
            Throw ##class(%Exception.StatusException).CreateFromStatus($$$ERROR($$$GeneralError, "Evaluation metrics not found"))
        }

        Set execResults = ##class(dc.artisan.PromptEvaluation).ExecuteTestPrompt(
            requestContent.provider, requestContent.testDataset, requestContent.prompt, evalMetrics, llm
        )

        Set resultsTotalDict = execResults."__getitem__"(0)
        Set resultsDataframe = execResults."__getitem__"(1)
        Set resultsMetrics = execResults."__getitem__"(2)
        Set response = ##class(dc.artisan.PromptEvaluation).GenerateHtmlReport(resultsDataframe, resultsTotalDict, resultsMetrics)
        
        Do ##class(%REST.Impl).%WriteResponse(response)
    } Catch (ex) {
        Do ex.Log()
        Throw ex
    }
    Return $$$OK
}

}
