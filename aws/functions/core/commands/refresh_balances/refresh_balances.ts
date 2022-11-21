import Config from "../../config/config";
import { AgentTable } from "../../db/agents";
import { getWallet } from "../../lib/chain/wallet";
import { formatUnits } from "ethers/lib/utils";


interface RefreshBalancesPayload {
    agent_address?: string       // Optionally, provide a single address to reload one agent only.
}

export default async (payload: RefreshBalancesPayload, config: Config) => {

    // Load agents (obtaining wallet indexes)
    let agents = []
    if (payload.agent_address) {
        agents = [await AgentTable.load(payload.agent_address!)]
    } else {
        agents = await AgentTable.loadAll()
    }


    // Loop over the agents, and:
    // - load the agent's wallet
    // - get the balance
    // - save the Agent with the updated balance

    for (let agent of agents) {
        const wallet = await getWallet(agent.wallet_index, config)
        const balance = await wallet.getBalance();

        console.log(`Updating agent ${agent.agent_address} balance to ${formatUnits(balance)}`)
        await AgentTable.saveBalance(agent.agent_address, balance)
    }

}
