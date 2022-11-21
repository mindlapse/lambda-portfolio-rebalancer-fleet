import { BigNumber, ethers } from "ethers";
import Config from "../../config/config"
import { AgentTable } from "../../db/agents";
import Tokens from "../../lib/chain/tokens";
import { calcGas, gasAsGwei, getWallet, isGasAcceptable } from "../../lib/chain/wallet";
import { abi } from './wmatic.abi.json';
import { PendingTxnTable } from '../../db/pending_txn';
import { TxnType } from "../../types/types";

interface Payload {
    only_addresses?: string[]
}

/*
 * Unwraps the base token (WMATIC) for all agents with a positive balance
 */
export default async (payload: Payload, config: Config) => {
    
    // Don't bother if gas is too high
    const gas = await calcGas();
    if (!isGasAcceptable(gas)) {
        throw Error(`gas too high ${gasAsGwei(gas)}`);
    }

    // Load agents, filtered acccording to the payload
    let agents = await AgentTable.loadAll();
    if (payload.only_addresses) {
        agents = agents.filter(a => payload.only_addresses!.indexOf(a.agent_address) >= 0)
    }

    const wmatic = Tokens.wmatic();

    // For each agent, unwrap
    for (let agent of agents) {

        const wallet = await getWallet(agent.wallet_index, config)
        const contract = new ethers.Contract(wmatic.address, abi, wallet)
        const unwrapBalance = await contract.balanceOf(agent.agent_address) as BigNumber;

        // If the agent has balance, then unwrap
        if (unwrapBalance.gt(0)) {
            console.log(`${agent.agent_address} Submitting unwrap request`)

            const gasLimit = await contract.estimateGas.withdraw(unwrapBalance);
            console.log("Estimated gas limit", gasLimit)

            const txnReceipt = await contract.withdraw(unwrapBalance,
                {
                    maxFeePerGas: gas.maxFeePerGas,
                    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
                    gasLimit: gasLimit.mul(110).div(100)
                })

            await PendingTxnTable.submitTxn({
                txn_hash: txnReceipt.hash,
                agent_address: agent.agent_address,
                wallet_index: agent.wallet_index,
                symbol: wmatic.symbol!,
                amount: unwrapBalance.toString(),
                created_on: new Date().toISOString(),
                type: TxnType.UNWRAP
            })

            console.log(`${agent.agent_address} submitted txn ${txnReceipt.hash} to unwrap balance: ${unwrapBalance}`)

        } else {
            console.log(`${agent.agent_address} skipped (no balance to unwrap)`)
        }
    }
}