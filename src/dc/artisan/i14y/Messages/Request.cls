Class dc.artisan.i14y.Messages.Request Extends Ens.Request
{

/// The Bundle JSON string
Property Bundle As %String(MAXLEN = "");

/// The LLM model to use
Property Model As %String(MAXLEN = 100);

Storage Default
{
<Data name="RequestDefaultData">
<Subscript>"Request"</Subscript>
<Value name="1">
<Value>Bundle</Value>
</Value>
<Value name="2">
<Value>Model</Value>
</Value>
</Data>
<DefaultData>RequestDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
