Class dc.artisan.i14y.Messages.CollectionResp Extends (Ens.Response, %JSON.Adaptor)
{

Property exist As %Boolean(%JSONFIELDNAME = "exist");

Storage Default
{
<Data name="CollectionRespDefaultData">
<Subscript>"CollectionResp"</Subscript>
<Value name="1">
<Value>exist</Value>
</Value>
</Data>
<DefaultData>CollectionRespDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
