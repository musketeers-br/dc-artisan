Include Ensemble

Class dc.artisan.i14y.DocumentsOperation Extends Ens.BusinessOperation
{

Parameter INVOCATION = "Queue";

Method DocumentsList(pRequest As dc.artisan.i14y.Messages.DocumentsReq, Output pResponse As dc.artisan.i14y.Messages.Response) As %Status
{
    Set tSC = $$$OK
    Set pResponse = ##class(dc.artisan.i14y.Messages.Response).%New()
    Try {
      Set tStatement = ##class(%SQL.Statement).%New()
      set tStatement.%SelectMode = 1
      Set sql = "SELECT JSON_OBJECT('id': id, 'embedding': embedding, 'document': document, 'metadata': metadata) as Doc FROM SQLUser."_$Char(34)_pRequest.Name_$Char(34)
      Set qStatus = tStatement.%Prepare(sql)
      Throw:$$$ISERR(qStatus) qStatus
      Set rset = tStatement.%Execute()
      Set json = []
      While (rset.%Next()) {
        Do json.%Push({}.%FromJSON(rset.Doc))
      }
      Set pResponse.Result = json.%ToJSON()
    } Catch ex {
        Set tSC = ex.AsStatus()
    }
    Return tSC
}

Method DocumentDelete(pRequest As dc.artisan.i14y.Messages.ChunkDeleteReq, Output pResponse As dc.artisan.i14y.Messages.Response) As %Status
{
    Set tSC = $$$OK
    Set pResponse = ##class(dc.artisan.i14y.Messages.Response).%New()
    Try {
      Set tStatement = ##class(%SQL.Statement).%New()
      set tStatement.%SelectMode = 1
      Set sql = "Delete FROM SQLUser."_$Char(34)_pRequest.Name_$Char(34)_" Where id = ? "
      Set qStatus = tStatement.%Prepare(sql)
      Throw:$$$ISERR(qStatus) qStatus
      Set rset = tStatement.%Execute(pRequest.ChunkId)
      
    } Catch ex {
        Set tSC = ex.AsStatus()
    }
    Return tSC
}

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
  <MapItem MessageType="dc.artisan.i14y.Messages.DocumentsReq">
    <Method>DocumentsList</Method>
  </MapItem>
  <MapItem MessageType="dc.artisan.i14y.Messages.CollectionReq">
    <Method>CollectionExists</Method>
  </MapItem>

  <MapItem MessageType="dc.artisan.i14y.Messages.ChunkDeleteReq">
    <Method>DocumentDelete</Method>
  </MapItem>
</MapItems>
}

}
