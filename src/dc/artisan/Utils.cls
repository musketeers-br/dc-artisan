Class dc.artisan.Utils Extends %RegisteredObject
{

ClassMethod StartProduction()
{
    Set pProductionName = "dc.artisan.i14y.Production"
    Set attempt = 0
    Set maxAttempts = 10
    While (attempt < maxAttempts) && '##class(Ens.Director).IsProductionRunning(pProductionName) {
        Hang 1
        Do ##class(Ens.Director).SetAutoStart(pProductionName)
            Do ##class(Ens.Director).StartProduction(pProductionName)
            Set attempt = attempt + 1
    }
    If '##class(Ens.Director).IsProductionRunning(pProductionName) {
        Write "Produciton "_pProductionName_" couldn't be started. Please start it manually."
    }
}

}
