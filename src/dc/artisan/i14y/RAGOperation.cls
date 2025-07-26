Include Ensemble

Class dc.artisan.i14y.RAGOperation Extends Ens.BusinessOperation
{

Parameter INVOCATION = "Queue";

Method CollectionExists(pRequest As dc.artisan.i14y.Messages.CollectionReq, Output pResponse As dc.artisan.i14y.Messages.CollectionResp) As %Status
{
    Set tSC = $$$OK
    Set namespace = $Namespace
    Set pResponse = ##class(dc.artisan.i14y.Messages.CollectionResp).%New()
    Set pResponse.exist = $$$NO
    Set:(pRequest.Namespace="") pRequest.Namespace = namespace
    Try {
      ZN pRequest.Namespace

      Set tStatement = ##class(%SQL.Statement).%New()
      Set qStatus = tStatement.%Prepare("SELECT count(*) FROM SQLUser."_$Char(34)_pRequest.Name_$Char(34))
      If qStatus'=1 {
        ZN namespace
        Return tSC
      }
      Set rset = tStatement.%Execute()
      Set:(rset.%Next()) pResponse.exist = $$$YES
    } Catch ex {
        Set tSC = ex.AsStatus()
    }
    ZN namespace
    Return tSC
}

XData MessageMap
{
<MapItems>
  <MapItem MessageType="dc.artisan.i14y.Messages.CollectionReq">
    <Method>CollectionExists</Method>
  </MapItem>
</MapItems>
}

}
