import { deleteItem, putItem, scan } from "../lib/dynamodb/dynamo";
import { PendingTxn } from "../types/types";

const { 
    TABLE_PENDING_TXN,
} = process.env;


export class PendingTxnTable {

    static loadPending = async (): Promise<PendingTxn[]> => {
        return await scan(TABLE_PENDING_TXN!) as PendingTxn[]
    }

    static submitTxn = async (txn: PendingTxn) => {
        await putItem(TABLE_PENDING_TXN!, txn);
    }

    static deleteTxn = async (txn: PendingTxn) => {
        await deleteItem(TABLE_PENDING_TXN!, { "txn_hash" : { "S": txn.txn_hash }})
    }

}