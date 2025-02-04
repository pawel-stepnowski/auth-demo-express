import * as Auth from '@liquescens/auth-nodejs';
import { SecretManagerServiceClient  } from '@google-cloud/secret-manager';
import Ajv2020 from "ajv"

/**
 * @returns {Promise<Configuration>}
 */
export async function load()
{
    const data = process.env.node_env === 'local' 
        ? await loadConfigurationFromLocalFile()
        : await loadConfigurationFromSecretManagerService();
    const { application, cors, authentication } = await validateConfiguration(data);
    const { id, redirect_uri, return_uri } = authentication;
    /** @type {Record<string, import('@liquescens/auth-nodejs').OAuth2.Provider>} */
    const providers = {};
    for (const [id, properties] of Object.entries(authentication.providers))
    {
        const configuration = { ...properties, id, redirect_uri, return_uri }
        switch (id)
        {
            case 'google': providers[id] = new Auth.OAuth2.Google(configuration); break;
            case 'microsoft': providers[id] = new Auth.OAuth2.Microsoft(configuration); break;
            case 'github': providers[id] = new Auth.OAuth2.Github(configuration); break;
        }
    }
    return { application, authentication: { id, providers }, cors };
}

/**
 * @param {*} configuration 
 * @returns {Promise<Configuration>}
 */
async function validateConfiguration(configuration)
{
    // @ts-ignore
    const gcloud_schema = await import("../schemas/gcloud.schema.json", { with: { type: "json" } });
    // @ts-ignore
    const config_schema = await import("../schemas/configuration.schema.json", { with: { type: "json" } });
    const ajv = new Ajv2020.Ajv({ schemas: [gcloud_schema.default, config_schema.default] });
    const validator = ajv.getSchema("https://raw.githubusercontent.com/pawel-stepnowski/auth-demo-express/refs/heads/master/schemas/configuration.schema.json");
    if (!validator) throw new Error('TODO');
    const is_valid = validator(configuration);
    if (!is_valid)
    {
        console.error(ajv.errorsText(validator.errors));
        throw new Error('Invalid configuration file.');
    }
    return configuration;
}

export async function loadConfigurationFromLocalFile()
{
    // @ts-ignore
    const data = await import("../config/config.local.json", { with: { type: "json" } });
    return data.default;
}

export async function loadConfigurationFromSecretManagerService()
{
    const client = new SecretManagerServiceClient();
    const secret_name = "projects/1011928235427/secrets/Demo/versions/latest";
    const [response] = await client.accessSecretVersion({ name: secret_name });
    const secret = response.payload?.data?.toString();
    if (!secret) throw new Error(`Secret "${secret_name}" is empty.`);
    return JSON.parse(secret);
}