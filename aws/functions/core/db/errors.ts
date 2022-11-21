import { putItem } from "../lib/dynamodb/dynamo"
import { TradePayload } from "../types/types";


const { TABLE_ERRORS } = process.env;

export class ErrorsTable {
    
    static saveError = async (trade: TradePayload, e: any) => {

        const errorSaved = {
            name: e.name,
            message: e.message,
            lineNumber: e.lineNumber,
            cause: e.cause
        }

        await putItem(TABLE_ERRORS!, {
            "created_on": new Date().toISOString(),
            "agent_address": trade.agent_address,
            "trade_uuid": trade.uuid,
            "error": JSON.stringify(errorSaved)
        })
    }
}