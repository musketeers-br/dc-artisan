Class dc.artisan.i14y.Messages.ChunkDeleteReq Extends (Ens.Request, %JSON.Adaptor)
{

/// Collection Name
Property Name As %String(%JSONFIELDNAME = "collection", MAXLEN = 100);

Property ChunkId As %String(%JSONFIELDNAME = "chunk_id", MAXLEN = "");

Storage Default
{
<Data name="ChunkDeleteReqDefaultData">
<Subscript>"ChunkDeleteReq"</Subscript>
<Value name="1">
<Value>Name</Value>
</Value>
<Value name="2">
<Value>ChunkId</Value>
</Value>
</Data>
<DefaultData>ChunkDeleteReqDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
