import { BigNumber, ethers } from "ethers";
import Config from "../../config/config";
import { AgentTable } from "../../db/agents";
import { getWallet } from "../../lib/chain/wallet";
import { publishOne } from "../../lib/sns/sns";

const { 
    TABLE_AGENTS, TABLE_ERRORS,
    TOPIC_ARN_REFILL_TRADING_FEE
} = process.env;

interface RefillTradingFeesPayload {
    only_addresses: string[]
}

export default async (payload: RefillTradingFeesPayload, config: Config) => {

    // Define balance thresholds
    const minBalance = ethers.utils.parseUnits("1");
    const reserveBalance = minBalance.mul(2);

    // Load the zero wallet & balance
    const wallet = await getWallet(0, config);
    const balance = await wallet.getBalance();
    console.log(`Current base balance is ${balance.toString()} for ${wallet.address}`);

    // Load agents, filtered acccording to the payload
    let agents = await AgentTable.loadAll();
    if (payload.only_addresses) {
        agents = agents.filter(a => payload.only_addresses!.indexOf(a.agent_address) >= 0)
    }
    console.log("# of agents selected", agents.length)


    // If there is less than the mininum balance threshold, break
    if (balance.lt(minBalance)) {
        const error = "Not enough balance to refill"
        console.error(error);
        throw error;
    }

    // Divy up amounts to transfer from the first
    // agent to all others - keeping the reserveBalance amount aside.
    const perAgentAmount = balance.sub(reserveBalance).div(agents.length + 1);  
    console.log("perAgentAmount", perAgentAmount.toString())


    // For each agent, publish a payload to refill_trading_fee
    for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        console.log(`Refilling agent ${agent.agent_address}`);
        await publishOne(TOPIC_ARN_REFILL_TRADING_FEE!,  {
            "agent_address": agent.agent_address,
            "amount" : perAgentAmount.toString()
        })
    }
    console.log(`Finished publishing to ${TOPIC_ARN_REFILL_TRADING_FEE}`);
}

