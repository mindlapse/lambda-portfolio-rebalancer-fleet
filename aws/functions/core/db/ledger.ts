
import { putItem } from '../lib/dynamodb/dynamo'
import { TxnType } from '../types/types'

const {
    TABLE_LEDGER
} = process.env

export interface LedgerEntry {
    txn_hash: string
    txn_block: number
    txn_idx: number
    gas: string

    agent_address: string
    symbol: string
    price: number

    type: TxnType
    amount: string
    debit: boolean
    created_on: string
}

export class LedgerTable {


    static addEntry = async (entry: LedgerEntry) => {
        putItem(TABLE_LEDGER!, entry)
    }

}