import * as Auth from '@liquescens/auth-nodejs';
/** @typedef {import('@liquescens/auth-nodejs').OAuth2.Provider} Provider */

export class Authentication extends Auth.Authentication
{
    /**
     * @param {Record<string, Provider>} providers 
     */
    constructor(providers)
    {
        super(providers);
        this.providers = providers;
    }

    /**
     * @param {import('express').Request} request 
     * @returns {{ provider: Provider, authorization_code: string }}
     */
    handleRedirect(request)
    {
        if (typeof request.query.state !== 'string') throw new Error('Authentication redirect does not contain a query.');
        const state = JSON.parse(request.query.state);
        if (typeof state.provider !== 'string') throw new Error('Authentication redirect query does not contain provider id.');
        const provider = this.providers[state.provider];
        if (!provider) throw new Error('Authentication redirect contains unknown provider identifier.');
        const authorization_code = request.query.code;
        if (typeof authorization_code !== 'string' || !authorization_code) throw new Error('Authentication redirect query does not contain authorization code.');
        return { provider, authorization_code };
    }
}