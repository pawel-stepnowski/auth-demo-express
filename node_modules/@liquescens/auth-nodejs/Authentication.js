export class Authentication
{
    /**
     * @param {Record<string, import('./oauth2/Provider.js').Provider>} providers 
     */
    constructor(providers)
    {
        this.providers = providers;
    }
}