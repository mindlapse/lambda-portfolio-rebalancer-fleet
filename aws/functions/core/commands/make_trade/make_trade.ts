import { BigNumber, ethers } from 'ethers'
import JSBI from 'jsbi'
import IERC20 from '@openzeppelin/contracts/build/contracts/IERC20.json'

import Config from "../../config/config";
import Tokens from "../../lib/chain/tokens";
import { calcGas, gasAsGwei, getWallet, isGasAcceptable } from "../../lib/chain/wallet";
import { Side, TradePayload, TxnType } from "../../types/types";
import Addr from "../../lib/chain/addr";
import { swap } from "../../lib/chain/swap";
import { AgentTable } from '../../db/agents';
import { PendingTxnTable } from '../../db/pending_txn';
import { ErrorsTable } from '../../db/errors'
import { TradesTable } from '../../db/trades';

export default async (tradePayload: TradePayload, config: Config) => {

    // Load the agent
    const agent = await AgentTable.load(tradePayload.agent_address);
    console.log("Loaded agent", agent)

    // If the agent is inactive then ignore the trade
    // and make no changes to state until that trade is settled.
    if (!agent.is_active) {
        console.log(
            `Agent ${agent.agent_address} ` +
            `with open trade ${agent.open_trade_id} is not active. ` +
            `Trade payload ignored.`)
        return;
    } else {
        // The agent is active.
        // If the agent does not have an open_trade_id set, this is unexpected.
        // Deactivate the agent and return.
        if (!agent.open_trade_id) {
            console.log(`Agent ${agent.agent_address} is missing expected open_trade_id`);
            await AgentTable.setActivation(agent.agent_address, false);
            return
        }
    }

    // Obtain the gas estimate.  If the gas estimate is too high, 
    // then drop the trade and return.

    const gasEstimate = await calcGas();
    if (!isGasAcceptable(gasEstimate)) {
        const error = `gas too high ${gasAsGwei(gasEstimate)}. ` +
            ` dropping trade '${agent.open_trade_id}' and clearing agent.open_trade_id`;
        await AgentTable.setOpenTradeId(agent.agent_address, "");
        await TradesTable.dropTrade(agent.open_trade_id);
        console.log(error);
        throw Error(error);
    }

    // Load the wallet for the agent and the balance

    const wallet = await getWallet(agent.wallet_index, config);
    const balance = await wallet.getBalance();

    // Get the balance of WMATIC and WETH each (currently hardcoded)

    const wethContract = new ethers.Contract(Addr.weth(), IERC20.abi, wallet);
    const wmaticContract = new ethers.Contract(Addr.wmatic(), IERC20.abi, wallet);
    const [wethBalance, wmaticBalance]: BigNumber[] = await Promise.all([
        wethContract.balanceOf(wallet.address),
        wmaticContract.balanceOf(wallet.address)
    ]);

    // Log address and current balances

    console.log("Address", wallet.address);
    console.log("Balances: ", {
        "matic": balance.toString(),
        "wmatic": wmaticBalance.toString(),
        "weth": wethBalance.toString(),
    });
 
    // Determine the direction of the trade

    let inputToken, inputBalance, inputValue;
    let outputToken, outputBalance;

    if (tradePayload.side === Side.BUY) {
        inputToken = Tokens.wmatic()
        outputToken = Tokens.weth()
        inputBalance = wmaticBalance
        inputValue = wmaticBalance

    } else {
        inputToken = Tokens.weth()
        outputToken = Tokens.wmatic()
        inputBalance = wethBalance
        inputValue = wethBalance.mul(Math.round(10**8 * parseFloat(tradePayload.current_price))).div(10**8)
    }
    

    let error: any;
    let halfCoin = ethers.utils.parseUnits("0.5");

    // If there is not enough for fees, deactivate the agent and stop
    if (balance.lt(halfCoin)) {
        error = Error("Insufficient wallet balance for fees");
    }

    // if the input balance is too small or empty, deactivate the agent and stop
    if (inputValue.lt(halfCoin)) {
        error = Error(`Input balance ${inputValue.toString()} is too low`);
    }

    // If the above validations passed, perform the swap
    if (!error) {
        try {
            const result = await swap(
                wallet,
                inputToken.wrapped,
                JSBI.BigInt(inputBalance.toString()),
                outputToken.wrapped,
                gasEstimate);

            const now = new Date().toISOString();

            // The trade request is updated with the txn_hash 
            // so it can be cross-referenced with the ledger and txn tables
            await TradesTable.saveTrade({
                ...tradePayload,
                txn_hash: result.hash,
                input_token: inputToken.symbol ?? "",
                input_bal: inputBalance.toString(),
                created_on: now
            })

            // the trade is settled downstream from the pending_txn table,
            // unlocking the agent ( this can mean the agent
            // remains locked for a long period of time if the submitted swap txn 
            // has insufficient gas )
            await PendingTxnTable.submitTxn({
                txn_hash: result.hash,
                trade_uuid: tradePayload.uuid,
                agent_address: agent.agent_address,
                wallet_index: agent.wallet_index,
                symbol: inputToken.symbol!,
                amount: inputBalance.toString(),
                created_on: now,
                type: TxnType.SWAP,
            })
        } catch (e) {
            error = e;
        }
    }

    // If there was an error, deactivate the agent and throw
    if (error) {
        ErrorsTable.saveError(tradePayload, error);
        AgentTable.setActivation(agent.agent_address, false);
        AgentTable.setOpenTradeId(agent.agent_address, "");
        console.error("Error", error);
        throw (error)
    }
}

