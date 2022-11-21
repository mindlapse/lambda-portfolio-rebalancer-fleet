import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { deleteItem, dynamoDBClient, putItem, scan } from "../lib/dynamodb/dynamo";
import { SettledTradeWithReceipt, SubmittedTradeRow, TradePayload, UpdateTradeWithReceipt } from "../types/types";
import { TxnStatus } from '../types/types';

const { 
    TABLE_TRADES,
} = process.env;


export class TradesTable {

    
    static loadTrades = async (): Promise<SettledTradeWithReceipt[]> => {
        return await scan(TABLE_TRADES!) as SettledTradeWithReceipt[]
    }
    
    
    static putTrade = async (trade: TradePayload) => {
        await putItem(TABLE_TRADES!, trade);
    }
    

    static dropTrade = async (openTradeId: string) => {

        const updateCmd = new UpdateItemCommand({
            TableName: TABLE_TRADES,
            Key: { "uuid" : { "S": openTradeId }},
            ExpressionAttributeValues: {
                ":trade_status" : { "S" : TxnStatus.DROPPED },
            },
            UpdateExpression: "SET trade_status=:trade_status"
        })
        await dynamoDBClient.send(updateCmd);
    }
    

    static saveTrade = async (trade: SubmittedTradeRow) => {

        const updateCmd = new UpdateItemCommand({
            TableName: TABLE_TRADES,
            Key: { "uuid" : { "S": trade.uuid }},
            ExpressionAttributeValues: {
                ":txn_hash" : { "S": trade.txn_hash },
                ":input_bal" : { "S": trade.input_bal },
                ":input_token" : { "S": trade.input_token },
                ":updated_on" : { "S": new Date().toISOString() }
            },
            UpdateExpression: "SET " +
                "txn_hash=:txn_hash," +
                "input_bal=:input_bal," +
                "input_token=:input_token," +
                "updated_on=:updated_on" 
        })
        await dynamoDBClient.send(updateCmd);
        console.log("Updated trade", trade)
    }


    static updateTradeWithReceipt = async (receipt: UpdateTradeWithReceipt) => {
        const cmd = new UpdateItemCommand({
            TableName: TABLE_TRADES,
            Key: { "uuid" : { "S": receipt.uuid }},
            ExpressionAttributeValues: {
                ":to_addr": { "S": receipt.to_addr },
                ":txn_block": { "N": receipt.txn_block.toString() },
                ":txn_idx": { "N": receipt.txn_idx.toString() },
                ":block_timestamp": { "N": receipt.block_timestamp.toString() },
                ":gas": { "S": receipt.gas },
                ":txn_status": { "S": receipt.txn_status },
                ":updated_on": { "S": new Date().toISOString() }
            },
            UpdateExpression: "SET " +
                "to_addr=:to_addr," +
                "txn_block=:txn_block," +
                "txn_idx=:txn_idx," +
                "block_timestamp=:block_timestamp," +
                "gas=:gas," +
                "txn_status=:txn_status," +
                "updated_on=:updated_on"
        })
        await dynamoDBClient.send(cmd)
        console.log("Updated trade with receipt", receipt)
    }


    static settleTrade = async (info: TradeSettledInfo) => {
        const cmd = new UpdateItemCommand({
            TableName: TABLE_TRADES,
            Key: { "uuid" : { "S": info.uuid }},
            ExpressionAttributeValues: {
                // ":input_bal" : { "S": info.input_bal },
                ":output_bal" : { "S": info.output_bal },
                ":input_price" : { "S": info.input_price },
                ":output_price" : { "S": info.output_price },
                ":trade_status" : { "S": info.trade_status },
                ":updated_on" : { "S" : new Date().toISOString() }
            },
            UpdateExpression: "SET " +
                // "input_bal=:input_bal," +
                "output_bal=:output_bal," +
                "input_price=:input_price," +
                "output_price=:output_price," +
                "trade_status=:trade_status," +
                "updated_on=:updated_on"
            })
        await dynamoDBClient.send(cmd)
        console.log("Updated trade with settled info", info)
    }


    static deleteTrade = async (uuid: string) => {
        await deleteItem(TABLE_TRADES!, { "uuid" : { "S": uuid }})
    }

}

export interface TradeSettledInfo {
    
    uuid: string

    input_bal: string
    output_bal: string

    input_price: string
    output_price: string
    trade_status: TxnStatus
}
