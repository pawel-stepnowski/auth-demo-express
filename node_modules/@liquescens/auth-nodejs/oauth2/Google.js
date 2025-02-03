import { Provider } from "./Provider.js";

export class Google extends Provider
{
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
            const id = data.sub;
            const mail = data.email;
            const display_name = data.email;
            return { id, mail, display_name, raw };
        }
        else throw new Error('Parsing identity error. Invalid content type of the server response.');
    }
}
