Class dc.artisan.i14y.Utils Extends %RegisteredObject
{

ClassMethod ResolveModelValue(input As %String) As %String
{
    // If input starts with @, treat it as an environment variable reference
    If $Extract(input, 1, 1) = "@" {
        Set envVarName = $Extract(input, 2, *)
        If envVarName = "" {
            Throw ##class(%Exception.General).%New("Invalid environment variable ID")
        }
        Set envValue = ##class(%SYSTEM.Util).GetEnviron(envVarName)
        Return envValue
    }
    
    // Otherwise, treat as direct value
    Return input
}

}
