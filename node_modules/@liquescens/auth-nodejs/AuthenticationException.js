
export class AuthenticationException
{
    /**
     * @param {'authorization_code' | 'token' | 'userinfo'} category 
     * @param {string} message 
     */
    constructor(category, message)
    {
        this.category = category;
        this.message = message;
    }
}
