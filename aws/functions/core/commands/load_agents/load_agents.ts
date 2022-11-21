import { v4 as uuidv4 } from 'uuid';
import Config from "../../config/config";
import { DECIMALS, WETH_WMATIC_PAIR, SMA_STEP } from "../../lib/constants";
import { publishOne } from '../../lib/sns/sns';
import { Agent, PriceRow, Side, TradePayload } from '../../types/types';
import { AgentTable } from '../../db/agents';
import { TradesTable } from '../../db/trades';
import { calcGas, gasAsGwei, isGasAcceptable } from '../../lib/chain/wallet';
import { PriceTable } from '../../db/price';
import { safePushPriceMetric } from '../../lib/cloudwatch/cloudwatch';


enum TradeAction {
    NONE = "NONE",
    ADD_TRADE = "ADD_TRADE",
    DROP_TRADE = "DROP_TRADE"
}

interface AgentTradeAction {
    agent: Agent,
    action: TradeAction
}

// Load environment (table names and SNS ARN for publishing trade requests )
const {
    TABLE_PRICE,
    SNS_TRADE_REQUEST
} = process.env;


export default async (payload: {}, config: Config) => {

    await throwIfGasUnacceptable();

    // Load agents and latest price row
    const agents = await AgentTable.loadActive()
    const priceRow = await PriceTable.getPrice(WETH_WMATIC_PAIR)

    // Error if the price was not found
    if (!priceRow) throw new Error("Price row not found");
    console.log("Have price", priceRow)

    // Find any trades that need to be added or dropped
    const tradeActions = await getTradeActions(agents, priceRow);
    
    // Handle trade adds and drops
    await handleTradeAdds(tradeActions, priceRow);
    await handleTradeDrops(tradeActions);

    // Log results
    console.log("Trades added for", tradeActions.filter(ta => ta.action === TradeAction.ADD_TRADE).map(ta => ta.agent.agent_address))
    console.log("Trades removed for", tradeActions.filter(ta => ta.action === TradeAction.DROP_TRADE).map(ta => ta.agent.agent_address))

}

const throwIfGasUnacceptable = async () => {
    const gasEstimate = await calcGas();
    if (!isGasAcceptable(gasEstimate)) {
        const error = `gas too high ${gasAsGwei(gasEstimate)}`;
        throw Error(error);
    }
}

const handleTradeAdds = async (actions: AgentTradeAction[], priceRow: PriceRow) => {

    // If the agent does not have an active trade, then
    // -. generate a UUID for a new trade
    // -. save an 'open' trade to the trades table, referencing the agent
    // -. update the agent by setting the open_trade_id to the id of the trade.
    // - send the trade for processing by publishing to SNS

    const price = parseFloat(priceRow!.price);
    const agentsForTradeAdds = actions.filter(ta => 
        ta.action === TradeAction.ADD_TRADE && ta.agent.is_active).map(ta => ta.agent);

    for (let i = 0; i < agentsForTradeAdds.length; i++) {
        let agent = agentsForTradeAdds[i];

        // if the agent does not have an open trade
        if (!agent.open_trade_id) {
            
            // save trade to trades table
            const trade = {
                uuid: uuidv4(),
                side: agent.side ?? Side.BUY,
                agent_address: agent.agent_address,
                current_price: price.toFixed(DECIMALS),
                created_on: new Date().toISOString(),
            } as TradePayload
            
            console.log("Requesting Trade:", trade);
            await Promise.all([
                TradesTable.putTrade(trade),
                AgentTable.setOpenTradeId(trade.agent_address, trade.uuid),
            ])
            await publishOne(SNS_TRADE_REQUEST!, trade);
        } else {
            console.log(
                `Skipping trade creation for agent ${agent.agent_address} `+
                `due to pre-existing open trade ${agent.open_trade_id}`)
        }
    }
}


const handleTradeDrops = async (actions: AgentTradeAction[]) => {
    const agentsForTradeDrops = actions.filter(ta => ta.action === TradeAction.DROP_TRADE).map(ta => ta.agent);

    for (let i = 0; i < agentsForTradeDrops.length; i++) {
        let agent = agentsForTradeDrops[i];

        await Promise.all([
            AgentTable.setOpenTradeId(agent.agent_address, ""),
            TradesTable.dropTrade(agent.open_trade_id)
        ]);
    }
}

interface BestTradeProximity {
    walletIndex?: number,
    gapPct?: number,
    priceNeeded?: number,
    price: number,
    side?: Side
}

const getTradeActions = async (agents: Agent[], priceRow: PriceRow): Promise<AgentTradeAction[]> => {
    const movingAverages = JSON.parse(priceRow.smas ?? "[]");

    const price = parseFloat(priceRow!.price)

    let bestProximity: BestTradeProximity = {
        price: price
    }

    const tradeActions = []
    for (let agent of agents) {

        let tradeAction = TradeAction.NONE;
        let side = agent.side;
        if (!side) side = Side.BUY

        const maIndex = Math.round(agent.ma_duration / SMA_STEP) - 1;
        const ma = movingAverages[maIndex];

        // Update trade proximity
        const lower = ma/agent.ma_init_gain;
        const upper = ma*agent.ma_init_gain;
        if (lower / price > (bestProximity.gapPct ?? 0)) {
            bestProximity.walletIndex = agent.wallet_index;
            bestProximity.gapPct = lower / price;
            bestProximity.priceNeeded = lower;
            bestProximity.side = Side.BUY
        } else if (price / upper > (bestProximity.gapPct ?? 0)) {
            bestProximity.walletIndex = agent.wallet_index;
            bestProximity.gapPct = price/upper;
            bestProximity.priceNeeded = upper;
            bestProximity.side = Side.SELL
        }


        if (side == Side.BUY) {

            await safePushPriceMetric(WETH_WMATIC_PAIR, agent.ma_duration, agent.ma_init_gain, lower);

            if (price <= lower) {
                if (!agent.open_trade_id) {
                    tradeAction = TradeAction.ADD_TRADE;
                }
            } else {
                if (agent.open_trade_id) {
                    tradeAction = TradeAction.DROP_TRADE;
                }
            }
        } else if (side == Side.SELL) {

            await safePushPriceMetric(WETH_WMATIC_PAIR, agent.ma_duration, agent.ma_init_gain, upper);

            if (price >= upper) {
                if (!agent.open_trade_id) {
                    tradeAction = TradeAction.ADD_TRADE;
                }
            } else {
                if (agent.open_trade_id) {
                    tradeAction = TradeAction.DROP_TRADE;
                }
            }
        }

        tradeActions.push({
            agent,
            action: tradeAction
        } as AgentTradeAction)
    }

    console.log('Most favorable trade', bestProximity)

    return tradeActions;
}
