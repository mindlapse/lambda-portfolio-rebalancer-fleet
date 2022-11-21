import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import Config from "../../config/config";
import { dynamoDBClient } from "../../lib/dynamodb/dynamo";
import { AgentTable } from '../../db/agents';

// A map of agent addresses to a (desired) activation status
type AgentIsActiveMap = Record<string, boolean>

interface SetActivationPayload {
    activated: boolean,
    override?: AgentIsActiveMap
}


export default async (payload: SetActivationPayload, config: Config) => {

    // Load agents
    // Determine what updates is needed to the is_active flag across all agents
    // Perform is_active flag updates & log

    
    const TABLE_AGENTS = process.env.TABLE_AGENTS!;
    const agents = await AgentTable.loadAll()

    const updates = [];
    for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const addr = agent.agent_address;
        const isActive = agent.is_active ?? false;
        const override = payload.override?.[addr];
        const activation = override ? override : payload.activated;
        
        if (activation !== isActive) {
            if (agent.balance < 1 && activation) {
                console.log(`Cannot activate ${agent.agent_address} due to their low trading fee balance (${agent.balance})`)
                continue;
            }
            updates.push([addr, activation])
        }
    }

    for (let i = 0; i < updates.length; i++) {
        const [addr, isActive] = updates[i] as [string, boolean];

        await dynamoDBClient.send(new UpdateItemCommand({

            TableName: TABLE_AGENTS,
    
            Key: { "agent_address" : { "S": addr }},
    
            ExpressionAttributeValues: {
                ":is_active" : { "BOOL" : isActive },
                ":updated_on" : { "S" : new Date().toISOString() },
            },
            UpdateExpression: "SET " +
                "is_active=:is_active," +
                "updated_on=:updated_on"
        }))
    }
    console.log("Updates", updates)
}
