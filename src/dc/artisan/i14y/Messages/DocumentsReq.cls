Class dc.artisan.i14y.Messages.DocumentsReq Extends Ens.Request
{

/// Collection Name
Property Name As %String(MAXLEN = 100);

Storage Default
{
<Data name="DocumentsReqDefaultData">
<Subscript>"DocumentsReq"</Subscript>
<Value name="1">
<Value>Name</Value>
</Value>
</Data>
<DefaultData>DocumentsReqDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
