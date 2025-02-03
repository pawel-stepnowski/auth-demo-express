import { AuthenticationException } from "../AuthenticationException.js";
import { Provider } from "./Provider.js";

export class Microsoft extends Provider
{
    /**
     * @param {string} code
     * @returns {Promise<Response>}
     */
    async _fetchToken(code)
    {
        try
        {
            const { token_uri, redirect_uri, client_id, client_secret } = this.configuration;
            const body = 
            {
                grant_type: 'authorization_code',
                code,
                redirect_uri,
                client_id,
                client_secret,
                scope: "https://graph.microsoft.com/.default"
            };
            return await fetch(token_uri,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(body).toString()
            });
        }
        catch
        {
            throw new AuthenticationException('token', 'TODO');
        }
    }

    /**
     * @param {Response} response
     * @returns {Promise<import("./Provider.js").IdentityInfo & { raw: string }>}
     */
    async _parseIdentity(response)
    {
        const content_type = response.headers.get('content-type');
        if (content_type?.startsWith('application/json'))
        {
            const raw = await response.text();
            const data = JSON.parse(raw);
            // from endpoint: https://graph.microsoft.com/v1.0/me
            if (data['@odata.context'] === 'https://graph.microsoft.com/v1.0/$metadata#users/$entity')
            {
                const id = data.id;
                const mail = data.mail;
                const display_name = data.displayName;
                return { id, mail, display_name, raw };
            }
            else throw new Error('Parsing identity error. Invalid odata context.');
        }
        else throw new Error('Parsing identity error. Invalid content type of the server response.');
    }
}
