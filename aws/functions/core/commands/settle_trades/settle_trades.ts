import { Trade } from "@uniswap/v3-sdk";
import { Wallet } from "ethers";
import { Interface } from "ethers/lib/utils";
import { Agent } from "http";

import Config from "../../config/config";
import { AgentTable } from "../../db/agents";
import { LedgerTable } from "../../db/ledger";
import { PriceTable } from "../../db/price";
import { TradesTable } from "../../db/trades";
import { getWallet } from "../../lib/chain/wallet";
import { WETH, WMATIC } from "../../lib/constants";
import { TxnReceiptWithLogs, TxnStatus } from "../../types/types";

export default async (payload: TxnReceiptWithLogs, config: Config) => {

    // If the txn failed:
        // Clear the open trade ID and reactivate the agent
        // No updates to the ledger
        // Mark the trade as failed
    // Otherwise
        // Update the trade table with the result
        // Update the ledger
            // - Credit the output amount from the trade
            // - Debit the input amount from the trade
        // Unlock the agent

    const wallet = await getWallet(payload.wallet_index, config);

    const isApplied = payload.txn_status === TxnStatus.APPLIED;
    const isReverted = payload.txn_status === TxnStatus.REVERTED;

    if (isApplied || isReverted) {

        // If the trade was successfully applied, create the ledger entries,
        // with the latest price for each symbol included
        if (isApplied) {
            const outputBal = await getTradeOutputAmount(payload, wallet)
            const ioPrices = await getTradeInputOutputPrices(payload.symbol);

            await createLedgerDebitEntry(payload, ioPrices.input_price);
            await createLedgerCreditEntry(payload, ioPrices.output_price, wallet, outputBal);
            await updateTradeSettleInfo(payload, outputBal, ioPrices, TxnStatus.APPLIED);
            await AgentTable.switchSides(payload.agent_address);
        } else {
            // No updates are needed to the Trade table since
            // the trade reverted.
            console.log("Trade reverted, reactivating agent")
        }

        // clear the open trade and reactivate the agent
        // TODO combine into a single update
        await AgentTable.setOpenTradeId(payload.agent_address, "");
        await AgentTable.setActivation(payload.agent_address, true);
    } else {
        console.log(`Taking no action due to payload.status ${payload.txn_status}`)
    }
}

interface PricesAfterTrade {
    input_price: string
    output_price: string
}


const updateTradeSettleInfo = async (payload: TxnReceiptWithLogs, outputBal: string, ioPrices: PricesAfterTrade, symbol: string) => {
    await TradesTable.settleTrade({
        input_bal: payload.amount,
        output_bal: outputBal,
        input_price: ioPrices.input_price,
        output_price: ioPrices.output_price,
        trade_status: TxnStatus.APPLIED,
        uuid: payload.trade_uuid!
    })
}


const getTradeInputOutputPrices = async (symbol: string): Promise<PricesAfterTrade> => {
    const prices = await PriceTable.loadAllPrices()

    let input, output;
    if (WMATIC === symbol) {
        input = WMATIC
        output = WETH
    } else if (WETH === symbol) {
        input = WETH
        output = WMATIC
    } else {
        throw Error(`Unsupported trade symbol ${symbol}`);
    }
    return { input_price: prices[input+"/USDC"], output_price: prices[output+"/USDC"] }
}


// TODO:  A ledger entry should be created with the current price attached 
const createLedgerEntry = async (payload: TxnReceiptWithLogs, symbol: string, debit: boolean, amount: string, price: string) => {
    await LedgerTable.addEntry({
        type: payload.type,
        agent_address: payload.agent_address,
        amount: amount,
        debit: debit,
        created_on: new Date().toISOString(),
        gas: payload.gas,
        symbol: symbol,
        price: parseFloat(price),
        txn_block: payload.txn_block,
        txn_hash: payload.txn_hash + (debit ? "_d":"_c"),
        txn_idx: payload.txn_idx,
    })
}


const createLedgerDebitEntry = async (payload: TxnReceiptWithLogs, price: string) => {
    await createLedgerEntry(payload, payload.symbol, true, payload.amount, price);
}

const getTradeOutputAmount = async (payload: TxnReceiptWithLogs, wallet: Wallet) => {

    // fetch the transaction receipt and parse the logs for Transfer events to get the input/amount amounts

    const txn = await wallet.provider.getTransactionReceipt(payload.txn_hash)
    const tei = new Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"])
    const transferInLog = tei.parseLog(txn.logs[1]);
    const transferOutLog = tei.parseLog(txn.logs[0])

    if (transferInLog.args.from !== payload.agent_address) {
        throw new Error(`Unexpected Transfer-in log ${JSON.stringify(transferInLog)}`)
    }
    if (transferOutLog.args.to !== payload.agent_address) {
        throw new Error(`Unexpected Transfer-out log ${JSON.stringify(transferOutLog)}`)
    }

    const inputBal = transferInLog.args.value.toString()
    const outputBal = transferOutLog.args.value.toString()

    console.log("input bal", inputBal)
    console.log("output bal", outputBal)
    return outputBal
}

const createLedgerCreditEntry = async (payload: TxnReceiptWithLogs, price: string, wallet: Wallet, amount: string) => {
    
    // Approach taken:
        // Since logs are available, parse the logs for Transfer events
        // to extract the exact amounts sent/received in the swap.
        // Throw an error if there is an unexpected address.

    // Approach NOT taken:
        // Given:
        // - The agent is (should be) inactive
        // - The agent previously had zero balance in the opposite token
        // Then:
        // - swaps haven't occurred since being inactive
        // - the balance of the opposite token should reflect the received amount from the swap, with fees already deducted


    const creditSymbol = (WETH === payload.symbol) ? WMATIC : WETH
    await createLedgerEntry(payload, creditSymbol, /*debit=*/false, amount, price);
}

