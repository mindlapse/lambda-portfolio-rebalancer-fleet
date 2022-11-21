import { ethers } from "ethers";
import Config from "../../config/config";
import { AgentTable } from "../../db/agents";
import { PendingTxnTable } from "../../db/pending_txn";
import Addr from "../../lib/chain/addr";
import Tokens from "../../lib/chain/tokens";
import { calcGas, gasAsGwei, getWallet, isGasAcceptable } from "../../lib/chain/wallet";
import { TxnType } from "../../types/types";

interface Payload {
    only_addresses?: string[]
}

export default async (payload: Payload, config: Config) => {

    // Stop if the gas is too high
    const gasEstimate = await calcGas();
    if (!isGasAcceptable(gasEstimate)) {
        throw Error(`gas too high ${gasAsGwei(gasEstimate)}`);
    }

    // Load agents (filtered according to the payload)
    let agents = await AgentTable.loadAll()
    if (payload.only_addresses) {
        agents = agents.filter(a => payload.only_addresses!.indexOf(a.agent_address) >= 0)
    }

    // For each agent (including inactive agents)
    //      - Load the native token balance, and subtract a reserve amount to obtain a wrappable amoun t
    //      - If the balance is +, then call the wrap contract

    for (let agent of agents) {

        const wallet = await getWallet(agent.wallet_index, config);
        const wrappableBalance = (await wallet.getBalance()).sub(ethers.utils.parseUnits("2"))

        if (wrappableBalance.gt(0)) {

            const txnResponse = await wallet.sendTransaction({
                maxFeePerGas: gasEstimate.maxFeePerGas,
                maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
                value: wrappableBalance,
                to: Addr.wmatic()
            })
            console.log("txnResponse", txnResponse);

            // TODO add to the submitted_txn table with appropriate type
            await PendingTxnTable.submitTxn({
                txn_hash: txnResponse.hash,
                agent_address: agent.agent_address,
                wallet_index: agent.wallet_index,
                symbol: Tokens.wmatic().symbol!,
                amount: wrappableBalance.toString(),
                created_on: new Date().toISOString(),
                type: TxnType.WRAP
            })

        } else {
            console.log(`Balance too low to wrap for agent ${agent.agent_address}`)
        }
    }
}