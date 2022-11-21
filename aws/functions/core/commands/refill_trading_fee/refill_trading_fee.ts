import { BigNumber, ethers } from "ethers";
import Config from "../../config/config";
import { calcGas, gasAsGwei, getWallet, isGasAcceptable } from "../../lib/chain/wallet";
import { getItem } from "../../lib/dynamodb/dynamo";

const { 
    TABLE_AGENTS,
} = process.env;

interface RefillTradingFeePayload {
    agent_address: string
    amount: string
}

export default async (payload: RefillTradingFeePayload, config: Config) => {

    console.log("Request payload", payload)
 
    // Load the wallet, balance, and agents
    const wallet = await getWallet(0, config);
    const balance = await wallet.getBalance();
  
    // Sanity check that the given address matches an agent
    const agent = await getItem(TABLE_AGENTS!, { "agent_address" : { "S": payload.agent_address } });
    if (!agent || agent.agent_address !== payload.agent_address) {
        const error = `No agent exists with the address ${payload.agent_address}`
        console.error(error);
        throw error;
    }

    // If there is less than 1 MATIC, break
    if (balance.lt(ethers.utils.parseUnits("1"))) {
        const error = "Not enough balance to refill"
        console.error(error);
        throw error;
    }

    // Transfer amount to address
    const gasEstimate = await calcGas();
    if (!isGasAcceptable(gasEstimate)) {
        throw Error(`gas too high ${gasAsGwei(gasEstimate)}`);
    }


    const txnResponse = await wallet.sendTransaction({
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
        value: BigNumber.from(payload.amount),
        to: payload.agent_address
    })

    console.log("txnResponse", txnResponse);
    console.log(`Transfer of ${payload.amount} to ${payload.agent_address} is submitted`);
}

