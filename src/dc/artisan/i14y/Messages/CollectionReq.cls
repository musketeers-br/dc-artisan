Class dc.artisan.i14y.Messages.CollectionReq Extends Ens.Request
{

/// Namespace Name
Property Namespace As %String(MAXLEN = "") [ InitialExpression = "IRISAPP" ];

/// Collection Name
Property Name As %String(MAXLEN = 100);

Storage Default
{
<Data name="CollectionReqDefaultData">
<Subscript>"CollectionReq"</Subscript>
<Value name="1">
<Value>Namespace</Value>
</Value>
<Value name="2">
<Value>Name</Value>
</Value>
</Data>
<DefaultData>CollectionReqDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
