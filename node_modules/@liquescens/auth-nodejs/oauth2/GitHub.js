import { Provider } from "./Provider.js";

export class Github extends Provider
{
    /**
     * @abstract
     * @param {string} text
     * @returns {import("./Provider.js").IdentityInfo}
     */
    _extractIdentityInfo(text)
    {
        const data = JSON.parse(text); 
        const id = data.id;
        const name = data.login;
        return { id, name };
    }
}