/**
 * @typedef JsonSchema
 * @property {'object' | 'string'} [type]
 * @property {{ [name: string]: JsonSchema }} properties
 * @property {string[]} required
 * @property {JsonSchema[]} [oneOf]
 * @property {string} [const]
 * @property {string} [$ref]
 * @property {string} [$id]
 * @property {string[]} [enum]
 */

/**
 * @typedef EmittedNamespace
 * @property {string} root_type_name
 * @property {Map<string, string>} types
 */

export class TypeDeclarationBuilder
{
    constructor()
    {
        /** @type {Map<string, EmittedNamespace>} */
        this.namespaces = new Map();
        /** @type {Map<string, string>} */
        this.schema_to_namespace = new Map();
    }

    /**
     * @param {string} name 
     * @param {JsonSchema} schema 
     */
    fromJsonSchema(name, schema)
    {
        if (schema.type === 'string') return;
        if (schema.type === undefined && schema.enum === undefined) return;
        if (schema.$id)
        {
            this._addNamespace(schema.$id, '', name);
        }
        const record_schema = schema.properties ? schema.properties["^.*$"] : undefined;
        if (record_schema)
        {
            const type_name = this._getTypeName(`${name}Item`, record_schema);
            this.fromJsonSchema(type_name, record_schema);
            this._addType('', name, `type ${name} = Record<string, ${type_name}>`);
        }
        else if (schema.enum)
        {
            this._addType('', name, `type ${name} = ${schema.enum.map(value => `"${value}"`).join(' | ')}`);
        }
        else
        {
            const properties = [];
            for (const [property_name, property_schema] of Object.entries(schema.properties))
            {
                if (property_schema.oneOf)
                {
                    const type_names = [];
                    for (const one_of_schema of property_schema.oneOf)
                    {
                        const type_name = this._getTypeName(property_name, one_of_schema, type_names.length);
                        type_names.push(type_name);
                        this.fromJsonSchema(type_name, one_of_schema);
                    }
                    properties.push(`${property_name}: ${type_names.join(' | ')}`); 
                }
                else if (property_schema.const)
                {
                    properties.push(`${property_name}: "${property_schema.const}"`);
                }
                else if (property_schema.$ref)
                {
                    properties.push(`${property_name}: ${this._referenceToTypeName(property_schema.$ref)}`);
                }
                else
                {
                    const type_name = this._getTypeName(property_name, property_schema);
                    this.fromJsonSchema(type_name, property_schema);
                    properties.push(`${property_name}: ${type_name}`);
                }
            }
            const lines = 
            [
                `type ${name} =`,
                `{`,
                ...properties.map(line => '    ' + line),
                `}`
            ];
            this._addType('', name, lines.join('\r\n'));
        }
    }
    
    /**
     * @param {string} schema_id 
     * @param {string} namespace 
     * @param {string} root_type_name 
     */
    _addNamespace(schema_id, namespace, root_type_name)
    {
        if (this.schema_to_namespace.get(schema_id)) throw new Error('TODO');
        this.schema_to_namespace.set(schema_id, namespace);
        let emitted_ns = this.namespaces.get(namespace);
        if (emitted_ns)
        {
            if (namespace !== '') throw new Error('TODO');
        }
        else this.namespaces.set(namespace, { root_type_name, types: new Map() });
    }

    /**
     * @param {string} namespace 
     * @param {string} type_name 
     * @param {string} declaration 
     */
    _addType(namespace, type_name, declaration)
    {
        let ns = this.namespaces.get(namespace);
        if (!ns) throw new Error('TODO'); //this.namespaces.set(namespace, namespace_types = { root_type_name new Map());
        if (ns.types.has(type_name)) throw new Error(`Type "${type_name}" is already defined in namespace "${namespace}".`);
        ns.types.set(type_name, declaration);
    }

    /**
     * @param {string} ref 
     */
    _referenceToTypeName(ref)
    {
        const namespace = this.schema_to_namespace.get(ref);
        if (namespace === undefined) throw new Error(`Unresolved reference "${ref}"`);
        let ns = this.namespaces.get(namespace);
        if (!ns) throw new Error('TODO');
        return ns.root_type_name;
    }

    /**
     * @param {string} base_name 
     * @param {JsonSchema} schema 
     * @param {number} [one_of]
     */
    _getTypeName(base_name, schema, one_of)
    {
        if (schema.type === 'string') return 'string';
        if (schema.type === undefined && schema.enum === undefined) return 'any';
        base_name = base_name.split('_').map(part => capitalize(part)).join('');
        if (typeof one_of === 'number') return `${base_name}_${one_of}`;
        return base_name;
    }
}

function capitalize(value)
{
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}