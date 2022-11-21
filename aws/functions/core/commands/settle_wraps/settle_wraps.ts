import Config from "../../config/config";
import { AgentTable } from "../../db/agents";
import { LedgerEntry, LedgerTable } from "../../db/ledger";
import { PriceTable } from "../../db/price";
import { Side, TxnReceiptWithLogs, TxnStatus, TxnType } from "../../types/types";


export default async (payload: TxnReceiptWithLogs, config: Config) => {

    // Settle by updating the ledger with the appropriate credit or debit

    const isApplied = payload.txn_status === TxnStatus.APPLIED;

    if (isApplied) {
        const prices = await PriceTable.loadAllPrices()
        const price = prices[payload.symbol + "/USDC"]
        if (!price) {
            throw new Error(`No price for symbol ${payload.symbol}`)
        }

        const ledgerEntry: LedgerEntry = {
            txn_hash: payload.txn_hash,
            txn_block: payload.txn_block,
            txn_idx: payload.txn_idx,
            gas: payload.gas,
    
            agent_address: payload.agent_address,
            symbol: payload.symbol,
            price: parseFloat(price),
            type: payload.type,
            amount: payload.amount,
    
            debit: payload.type === TxnType.UNWRAP,
            created_on: new Date().toISOString(),
        }
    
        console.log("Adding ledger entry", ledgerEntry)
        await AgentTable.switchSides(payload.agent_address, Side.BUY);
        await LedgerTable.addEntry(ledgerEntry);

    } else {
        console.log(`Taking no action due to payload.status ${payload.txn_status}`)
    }


}