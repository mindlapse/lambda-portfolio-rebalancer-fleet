import { AttributeValue, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand, ScanCommandOutput } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export type Row = Record<string, any>;

export const dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });

export const scan = async (tableName: string): Promise<Row[]>  => {
    const results: Row[] = [];
    try {
        let startKey;
        do {
    
            var command: ScanCommand = new ScanCommand({
                TableName: tableName,
                ConsistentRead: true,
                ExclusiveStartKey: startKey
            })
        
            const result = await dynamoDBClient.send(command);
            result.Items?.forEach(item => {
                const unpacked = unmarshall(item);
                results.push(unpacked);
            })
            
            startKey = result.LastEvaluatedKey
        } while (startKey);
        
    } catch (e) {
        console.error(e);
    }
    return results;
}


export const putItem = async (tableName: string, item: any) => {
    await dynamoDBClient.send(new PutItemCommand({
        TableName: tableName,
        Item: marshall(item)
    }))
}

export const getItem = async (tableName: string, key: Record<string, AttributeValue>) => {

    const result = await dynamoDBClient.send(new GetItemCommand({
        Key: key,
        TableName: tableName
    }))
    return result.Item ? unmarshall(result.Item) : undefined;
}

export const deleteItem = async (tableName: string, key: Record<string, AttributeValue>) => {
    const result = await dynamoDBClient.send(new DeleteItemCommand({
        Key: key,
        TableName: tableName
    }))
    return result;
}