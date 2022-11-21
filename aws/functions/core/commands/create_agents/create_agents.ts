import Config from "../../config/config";
import { getWallet } from '../../lib/chain/wallet'
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoDBClient } from '../../lib/dynamodb/dynamo';

interface CreateAgentsPayload {
    agents: number[][]
}

export default async (payload: CreateAgentsPayload, config: Config) => {

    const TABLE_AGENTS = process.env.TABLE_AGENTS;
    
    for (var idx = 0; idx < payload.agents.length; idx++) {
        const wallet = await getWallet(idx, config);
        const address = await wallet.getAddress();

        const [maInitGain, maDuration] = payload.agents[idx];

        await dynamoDBClient.send(new PutItemCommand({
            Item: {
                "agent_address" : {"S" : address},
                "wallet_index" : {"N" : ""+idx},
                "ma_init_gain" : {"N" : maInitGain.toFixed(4)},
                "ma_duration" : {"N": maDuration.toFixed(0)},
            },

            TableName: TABLE_AGENTS,
        }))
    }

}

interface Agent {
    agent_address: string
    wallet_index: number
    balance: string
}