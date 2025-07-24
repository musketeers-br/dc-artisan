Class dc.artisan.i14y.Messages.Response Extends Ens.Response
{

/// The analysis result from LLM
Property AnalysisResult As %String(MAXLEN = "");

Storage Default
{
<Data name="ResponseDefaultData">
<Subscript>"Response"</Subscript>
<Value name="1">
<Value>AnalysisResult</Value>
</Value>
</Data>
<DefaultData>ResponseDefaultData</DefaultData>
<Type>%Storage.Persistent</Type>
}

}
