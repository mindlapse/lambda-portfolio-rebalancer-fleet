import { putItem, dynamoDBClient, getItem } from "../lib/dynamodb/dynamo";
import { BatchGetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { WETH_USDC_PAIR, WETH_WMATIC_PAIR, WMATIC_USDC_PAIR } from "../lib/constants";
import { PriceHistoryRow, PriceRow } from "../types/types";

const { TABLE_PRICE, TABLE_PRICE_HISTORY } = process.env;

export interface AllPrices {
    [pair: string]: string /* price */
}

export class PriceTable {

    static async getPrice(pair: string) {
        return await getItem(TABLE_PRICE!, { 
            "pair" : { "S": pair }
        }) as PriceRow
    }

    static updatePrice = async (row: PriceRow) => {
        console.log("Updating moving averages to", typeof(row.smas), row.smas);
    
        await dynamoDBClient.send(new UpdateItemCommand({
            ExpressionAttributeValues: {
                ":price" : { "S" : row.price },
                ":liquidity" : { "S" : row.liquidity },
                ":updated_on" : { "S" : new Date().toISOString() },
                ":smas" : { "S" : row.smas ?? "" }
            },
            Key: { "pair" : { "S": row.pair }},
            TableName: TABLE_PRICE,
            UpdateExpression: `SET price=:price,liquidity=:liquidity,updated_on=:updated_on,smas=:smas`
        }))
    }

    static loadAllPrices = async (): Promise<AllPrices> => {
        const results = await dynamoDBClient.send(new BatchGetItemCommand({
            RequestItems: {
                [TABLE_PRICE as string]: { 
                    Keys: [
                        marshall({ pair: WETH_WMATIC_PAIR }),
                        marshall({ pair: WMATIC_USDC_PAIR }),
                        marshall({ pair: WETH_USDC_PAIR }),
                    ],
                    ProjectionExpression: 'pair,price',
                }
            }
        }));
        const allPrices: Record<string,string> = {};
        results.Responses?.[TABLE_PRICE as string]
            .map(o => unmarshall(o))
            .map(o => allPrices[o.pair] = o.price);

        return allPrices;
    }
}

export class PriceHistoryTable {

    static async addRow(row: PriceHistoryRow) {

        await putItem(TABLE_PRICE_HISTORY!, {
            ...row,
            created_on: new Date().toISOString(),
        })
    }

}

