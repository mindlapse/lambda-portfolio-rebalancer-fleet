import Config from "../../config/config";
import { PendingTxnTable } from "../../db/pending_txn";
import { TradesTable } from "../../db/trades";
import { getWallet } from "../../lib/chain/wallet";
import { publishOne } from "../../lib/sns/sns";
import { TxnReceiptWithLogs, TxnStatus, UpdateTradeWithReceipt } from "../../types/types";


const {
    SNS_ARN_TXN_RECEIPT
} = process.env


export default async (payload: {}, config: Config) => {

    const wallet = await getWallet(0, config);
    const pendingTxns = await PendingTxnTable.loadPending();

    for (let pending of pendingTxns) {
        console.log("Processing", pending)
        let type = pending.type;

        // Skip the pending txn if its missing the type field
        if (!type) {
            console.log(`Txn ${pending.txn_hash} is missing 'type'`)
            continue
        }
        
        // Fetch the txn to see if its mined
        const txn = await wallet.provider.getTransaction(pending.txn_hash);

        // Verify the 'from' address of the txn matches the expected address
        if (pending.agent_address.toLowerCase() !== txn.from.toLowerCase()) {
            console.error(`Expected ${pending.agent_address} but found ${txn.from}`)
            continue;
        }

        // If the txn is not yet mined, skip it for now
        if (txn === null || !txn.blockNumber) {
            console.log(`Txn ${pending.txn_hash} is not yet mined`)
            continue;
        }

        // The transaction was mined, so obtain a receipt
        const receipt = await wallet.provider.getTransactionReceipt(pending.txn_hash);
        if (receipt) {
            const block = await wallet.provider.getBlock(receipt.blockNumber);
            const txn_status = receipt.status === 1 ? TxnStatus.APPLIED : TxnStatus.REVERTED;

            let txnInfo = {
                to_addr: receipt.to,
                txn_block: receipt.blockNumber,
                txn_idx: receipt.transactionIndex,
                gas: receipt.cumulativeGasUsed.toString(),
                block_timestamp: block.timestamp,
                txn_status,
            }

            // Update the Trade table with the receipt info, if applicable
            let tradeReceiptInfo: UpdateTradeWithReceipt|undefined = undefined;
            if (pending.trade_uuid) {
                tradeReceiptInfo = {
                    uuid: pending.trade_uuid!,
                    ...txnInfo
                }
                await TradesTable.updateTradeWithReceipt(tradeReceiptInfo);
            }
    
            // Publish receipt info to SNS where it can be settled by a specialised function
            await publishOne(SNS_ARN_TXN_RECEIPT!, {
                ...pending,
                ...txnInfo,
                trade_uuid: pending.trade_uuid,
                logs: receipt.logs
            } as TxnReceiptWithLogs, {
                "type": {
                    DataType: "String",
                    StringValue: type
                }
            })
    
            // Delete from the pending_txn table
            await PendingTxnTable.deleteTxn(pending);
        }
    }
}
