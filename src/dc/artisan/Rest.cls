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
    <!--RAG Operations -->
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

        Set stream = ##class(%Stream.GlobalCharacter).%New()
        ;Do stream.Write(response.AnalysisResult)
        ;act as a Writer and create a detailed report on climate change. Your report should include the following sections:\n1. **Introduction** – Define climate change and explain its importance.\n2. **Causes** – Describe both natural and human-induced causes of climate change.\n3. **Impacts** – Discuss the effects of climate change on the environment, weather patterns, human health, and global economies.\n4. **Current Status** – Provide an overview of the current global situation, including data on temperature rise, carbon emissions, and key international agreements.\n5. **Solutions and Mitigation** – Outline efforts being made to combat climate change, such as renewable energy, carbon reduction strategies, and policy initiatives.\n6. **Conclusion** – Summarize key points and emphasize the urgency of action.\n*Use credible sources, include data where appropriate, and maintain a formal, informative tone throughout.*

    } Catch (ex) {
        Set tSC=ex.AsStatus()
        W $System.Status.GetErrorText(ex)
    }
    Return $$$OK
}

ClassMethod Answer() As %Status
{
    Try {
        Do ##class(%REST.Impl).%SetContentType("application/json")

        /*
        Given the original prompt:\n{current_prompt}\n
        And the user answers so far:\n{user_responses}\n
        Give a improved optimized prompt

        */
        Set userPrompt=##class(%DynamicAbstractObject).%FromJSON(%request.Content)

        Set response = {
            "originalPrompt": "act as a Writer and create a detailed report on climate change. Your report should include the following sections:\n1. **Introduction** – Define climate change and explain its importance.\n2. **Causes** – Describe both natural and human-induced causes of climate change.\n3. **Impacts** – Discuss the effects of climate change on the environment, weather patterns, human health, and global economies.\n4. **Current Status** – Provide an overview of the current global situation, including data on temperature rise, carbon emissions, and key international agreements.\n5. **Solutions and Mitigation** – Outline efforts being made to combat climate change, such as renewable energy, carbon reduction strategies, and policy initiatives.\n6. **Conclusion** – Summarize key points and emphasize the urgency of action.\n*Use credible sources, include data where appropriate, and maintain a formal, informative tone throughout.*",
            "clarifyingQuestions": [
                "1. **Audience:**\nWho is the intended audience for this report? (e.g., general public, high school students, policymakers, scientists)",
                "2. **Length & Depth:**\nHow long or detailed should the report be? Are you looking for a brief overview (\\~1,000 words), an in-depth paper (\\~3,000–5,000 words), or something else?",
                "3. **Style & Format:**\nDo you want the report formatted as an academic paper (with citations and references), a government-style white paper, or more of a general informative article?",
                "4. **Source Preferences:**\nDo you want references from specific sources (e.g., IPCC, NASA, NOAA), or should I use general credible scientific and governmental data?",
                "5. **Date Sensitivity:**\nDo you want the most up-to-date information available as of today, or are you okay with pre-2024 data?",
                "6. **Medium of Use:**\nWill this be used in print, web, presentation, or another format that might affect tone or structure?"
            ],
            "user_responses": [
                "1. Sutdents",
                "2. 500 words",
                "3. general information",
                "4. governmental",
                "5. last month",
                "6. web"
            ],
            "improved_prompt": "Act as a professional writer creating a formal, informative climate change report aimed at Bolivian students. The report should be approximately 500 words and include the following clearly labeled sections:\n\n1. **Introduction** – Briefly define climate change and explain why it's important for students in Bolivia to understand it.\n2. **Causes** – Describe both natural and human-driven causes of climate change, with examples relevant to Bolivia when possible.\n3. **Impacts** – Discuss how climate change is currently affecting the environment, weather patterns, public health, and the economy in Bolivia.\n4. **Current Status** – Provide up-to-date information from the past week on global and national trends, such as recent temperature changes, carbon emissions, or international climate developments relevant to Bolivia.\n5. **Solutions and Mitigation** – Outline practical efforts being taken globally and locally to combat climate change, including renewable energy, policy efforts in Bolivia, and youth activism.\n6. **Conclusion** – Summarize key points and emphasize the urgency of local and global action.\n\n\nUse the most recent credible sources (from the last week if possible), describe relevant data clearly without visuals, and reference sources informally within the text (e.g., According to a July 2025 UN report…)."
        }
        Do ##class(%REST.Impl).%WriteResponse(response)

    } Catch (ex) {
        Set tSC=ex.AsStatus()
        W $System.Status.GetErrorText(ex)
    }
    Return $$$OK
}

}
