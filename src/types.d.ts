type Storage_0 =
{
    type: "mockup"
}
type Storage_1 =
{
    type: "firestore"
    service_account: import('firebase-admin').ServiceAccount
}
type Application =
{
    storage: Storage_0 | Storage_1
}
type TokenPassMethod = "header" | "query"
type UserInfo =
{
    uri: string
    token_pass_method: TokenPassMethod
}
type ProvidersItem =
{
    type: string
    client_id: string
    client_secret: string
    token_uri: string
    user_info: UserInfo
}
type Providers = Record<string, ProvidersItem>
type Authentication =
{
    id: string
    base_uri: string
    redirect_uri: string
    return_uri: string
    providers: Providers
}
type Configuration =
{
    application: Application
    authentication: Authentication
    cors: any
}
