Class dc.artisan.i14y.Production Extends Ens.Production
{

/// Controls which properties are visible in the production settings UI
Parameter SETTINGS = "LLMModel";

/// Default model to use if not specified in request
Property LLMModel As %String;

XData ProductionDefinition
{
<Production Name="dc.artisan.i14y.Production" TestingEnabled="true" LogGeneralTraceEvents="false">
  <Description></Description>
  <ActorPoolSize>2</ActorPoolSize>
  <Setting Target="Adapter" Name="LLMModel">@ARTISAN_LLM_MODEL</Setting>

  <Item Name="OptimizerService" Category="" ClassName="dc.artisan.i14y.OptimizerService" PoolSize="0" Enabled="true" Foreground="false" Comment="" LogTraceEvents="true" Schedule="">
  </Item>
  <Item Name="AnswerService" Category="" ClassName="dc.artisan.i14y.AnswerService" PoolSize="0" Enabled="true" Foreground="false" Comment="" LogTraceEvents="true" Schedule="">
  </Item>
  <Item Name="IngestService" Category="" ClassName="dc.artisan.i14y.IngestService" PoolSize="0" Enabled="true" Foreground="false" Comment="" LogTraceEvents="true" Schedule="">
  </Item>

  <Item Name="OptimizerProcess" Category="" ClassName="dc.artisan.i14y.OptimizerProcess" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">
  </Item>
  <Item Name="AnswerProcess" Category="" ClassName="dc.artisan.i14y.AnswerProcess" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">
  </Item>
  <Item Name="IngestProcess" Category="" ClassName="dc.artisan.i14y.IngestProcess" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">
  </Item>

  <Item Name="LLMService" Category="" ClassName="dc.artisan.i14y.LLM.Operation.LiteLLMBO" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="true" Schedule="">
    <Setting Target="Adapter" Name="APIKeysConfig"></Setting>
    <Setting Target="Adapter" Name="Timeout">30</Setting>
  </Item>

</Production>
}

}
