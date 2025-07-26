Class dc.artisan.i14y.IngestProcess Extends Ens.BusinessProcess
{

Method OnRequest(pRequest As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentRequest, Output pResponse As dc.artisan.i14y.LLM.Messages.LiteLLMDocumentResponse) As %Status
{
    #dim ex As %Exception.AbstractException
    Set tSC = $$$OK
    Try {
        Set tSC = ..SendRequestSync("LLMService",pRequest, .pResponse)
    } Catch ex {
        Set tSC = $$$ERROR($$$GeneralError,"Error in Process: "_ex.DisplayString()_" at "_ex.Location)
    }

    Return tSC
}

Storage Default
{
<Type>%Storage.Persistent</Type>
}

}
