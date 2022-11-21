import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { dynamoDBClient, getItem, scan } from "../lib/dynamodb/dynamo";
import { Agent, Side } from "../types/types"
const { 
    TABLE_AGENTS,
} = process.env;

export class AgentTable {


    // Load one agent
    static load = async (agent_address: string): Promise<Agent> => {
        return await getItem(TABLE_AGENTS!, { "agent_address": {"S": agent_address } }) as Agent;
    }

    
    // Load all agents
    static loadAll = async (): Promise<Agent[]> => {
        return await scan(TABLE_AGENTS!) as Agent[];
    }

    // Load active agents
    static loadActive = async (): Promise<Agent[]> => {
        return (await scan(TABLE_AGENTS!) as Agent[]).filter(a => a.is_active);
    }


    // Save an updated balance for an agent
    static saveBalance = async (agent_address: string, balance: BigNumber) => {
        await dynamoDBClient.send(new UpdateItemCommand({
            ExpressionAttributeValues: {
                ":balance" : { "S" : formatUnits(balance) },
            },
            Key: { "agent_address" : { "S": agent_address }},
            TableName: TABLE_AGENTS!,
            UpdateExpression: `SET balance=:balance`
        }))
    }

    static switchSides = async (agent_address: string, side?: Side) => {
        const agent = await AgentTable.load(agent_address);

        let newSide = Side.BUY;
        if (side) {
            newSide = side
        } else {
            if (!agent.side || agent.side === Side.BUY) {
                newSide = Side.SELL;
            }
        }

        const updateCmd = new UpdateItemCommand({
            TableName: TABLE_AGENTS,
            Key: { "agent_address" : { "S": agent.agent_address }},

            ExpressionAttributeValues: {
                ":side" : { "S" : newSide },
            },
            UpdateExpression: "SET side=:side"
        });
        await dynamoDBClient.send(updateCmd);
    }

    /*
    * Set (or clear) the agent's open_trade_id.
    *
    * Context: 
    * When a TradeRequest is published, a unique identifier for the trade
    * is placed in this column for the Agent.  New TradeRequests won't be created
    * until the value is later emptied, after the trade.
    */
    static setOpenTradeId = async (agent_address: string, uuid: string) => {
        console.log(`Setting open_trade_id=${uuid} for agent ${agent_address}`)
        const updateCmd = new UpdateItemCommand({
    
            TableName: process.env.TABLE_AGENTS,
    
            Key: { "agent_address" : { "S": agent_address }},
    
            ExpressionAttributeValues: {
                ":open_trade_id" : { "S" : uuid },
            },
            UpdateExpression: "SET " +
                "open_trade_id=:open_trade_id"
        })
        await dynamoDBClient.send(updateCmd);
    }


    static setActivation = async (agent_address: string, activated: boolean): Promise<void> => {
        const updateCmd = new UpdateItemCommand({

            TableName: TABLE_AGENTS,

            Key: { "agent_address" : { "S": agent_address }},

            ExpressionAttributeValues: {
                ":is_active" : { "BOOL" : activated },
            },
            UpdateExpression: "SET is_active=:is_active"
        })
        await dynamoDBClient.send(updateCmd);
        console.log(`Setting ${agent_address} activation to ${activated}`)
    }

    
}
