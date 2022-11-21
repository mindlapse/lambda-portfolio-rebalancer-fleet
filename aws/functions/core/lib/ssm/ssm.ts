import { GetParameterCommand, PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const client = new SSMClient({});


export const getSecret = async (key: string) => {
    const keyPath = createKeyPath(key);
    
    const secret = await client.send(new GetParameterCommand({
        Name: keyPath,
        WithDecryption: true
    })).then(output => output.Parameter?.Value)

    console.log(`ssm:getSecret(): Loaded ${keyPath}.  Secret length: ${secret?.length}`);
    return secret ? JSON.parse(secret) : undefined;
}

/*
    Saves/Overwrites a secret under the given key at the default path.
    The value is serialized as JSON when saved, and then encrypted in AWS SSM

    The default path is: `/${process.env.PRODUCT}/${process.env.ENV}/`
*/
export const putSecret = async (key: string, value: object, desc?: string) => {

    const result = await client.send(new PutParameterCommand({
        Name: createKeyPath(key),
        Description: desc,
        Overwrite: true,
        Type: 'SecureString',
        Value: JSON.stringify(value)
    }))
    console.log("ssm:putSecret(): Result", result)
}

export const createKeyPath = (key: string) => {
    return `/${process.env.PRODUCT}/${process.env.ENV}/${key}`
}
