type storage_0 =
{
    type: "mockup"
}
type storage_1 =
{
    type: "firestore"
    service_account: import('firebase-admin').ServiceAccount
}
type application =
{
    storage: storage_0 | storage_1
}
type Configuration =
{
    application: application
    authentication: any
    cors: any
}
