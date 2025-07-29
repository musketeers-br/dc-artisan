Class dc.artisan.i14y.DocumentsService Extends Ens.BusinessService
{

/// An adapaterless BS
Parameter ADAPTER;

Method OnProcessInput(pInput As dc.artisan.i14y.Messages.DocumentsReq, Output pOutput As dc.artisan.i14y.Messages.Response) As %Status
{
    Try {
        // Validate input
        If '$IsObject(pInput) || (pInput.Name = "") {
            Return $$$ERROR($$$GeneralError, "Invalid input request")
        }
        
        Set sc = ..SendRequestSync("DocumentsOperation", pInput, .bpResponse)
        
        // Return final response
        Set pOutput = ##class(dc.artisan.i14y.Messages.Response).%New()
        Set pOutput.Result = bpResponse.Result
        Return $$$OK
        
    } Catch ex {
        Return ex.AsStatus()
    }
}

}
