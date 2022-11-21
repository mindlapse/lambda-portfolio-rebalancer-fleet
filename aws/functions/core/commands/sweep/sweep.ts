import { ethers } from "ethers";
import Config from "../../config/config";
import { AgentTable } from "../../db/agents";
import { calcGas, gasAsGwei, getWallet, isGasAcceptable } from "../../lib/chain/wallet";

interface Payload {
    only_addresses?: string[]
}

// Sweeps the native token, minus a reserve of 2 matic from all agents (or a subset specified in the payload)
// Swept tokens are sent to the config's external trusted address.
// Note: the ledger is not updated since it is a transfer of native amounts, not wrapped tokens.

// The function waits for each withdrawal to process serially.

export default async (payload: Payload, config: Config) => {

    // Obtain the destination address
    const destination = config.getTrustedWithdrawalAddress();
    if (!destination || !ethers.utils.isAddress(destination)) {
        throw Error(`Trusted withdrawal address is not a valid address ${destination}`);
    } else {
        console.log(`Withdrawal address set to ${destination}`)
    }

    // Load agents, filtered according to the payload
    let agents = await AgentTable.loadAll()
    if (payload.only_addresses) {
        agents = agents.filter(a => payload.only_addresses!.indexOf(a.agent_address) >= 0)
    }

    // For each agent:
    // - Load balance (subtracting reserve)
    // - If the balance is +, then call the wrap contract   
    for (let agent of agents) {

        // If the gas is too high, return
        const gasEstimate = await calcGas();
        if (!isGasAcceptable(gasEstimate)) {
            console.error(`gas too high ${gasAsGwei(gasEstimate)}`);
            return
        }

        // Obtain the sweep-able balance
        const wallet = await getWallet(agent.wallet_index, config);
        const balanceAvail = (await wallet.getBalance()).sub(ethers.utils.parseUnits("2"))

        // If we have sweep-able balance
        if (balanceAvail.gt(0)) {

            // Submit the sweep for the address to: 
            const txnResponse = await wallet.sendTransaction({
                maxFeePerGas: gasEstimate.maxFeePerGas,
                maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
                value: balanceAvail,
                to: destination
            })

            // Wait for the txn to resolve
            console.log(`Address ${agent.wallet_index} sweep submitted: ${txnResponse.hash} for ${balanceAvail.toString()}`);
            const result = await txnResponse.wait();
            console.log((result.status == 1) ? 'Succeeded' : 'Failed', result);
        
        } else {
            console.log(`Balance too low to wrap for agent ${agent.agent_address}`)
        }
    }
}