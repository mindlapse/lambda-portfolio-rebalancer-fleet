import { Price, Token } from "@uniswap/sdk-core";
import { Wallet } from "ethers";

import Config from "../../config/config";
import KnownContracts from '../../lib/chain/tokens';
import { getPool, getPrice } from '../../lib/chain/pool';
import { getWallet } from '../../lib/chain/wallet'
import { PriceHistoryTable, PriceTable } from '../../db/price';
import { WETH_WMATIC_PAIR, WMATIC_USDC_PAIR, WETH_USDC_PAIR, SMA_FROM, SMA_TO, SMA_STEP } from "../../lib/constants";
import { publishOne } from '../../lib/sns/sns';
import { safePushPriceMetric } from '../../lib/cloudwatch/cloudwatch';
import { PriceHistoryRow } from "../../types/types";

const { SNS_BALANCE_REFRESH_COMPLETE } = process.env;
const PRICE_DECIMALS = 5;


export default async (payload: {}, config: Config) => {

    console.log("In refresh_moving_average");
    
    const wallet = await getWallet(0, config);
    const wmatic = KnownContracts.wmatic();
    const weth = KnownContracts.weth();
    const usdc = KnownContracts.usdc();

    // Update prices for the trading pair and their USDC prices
    await updatePrices(WETH_WMATIC_PAIR, wallet, weth, wmatic, true, true);
    await updatePrices(WMATIC_USDC_PAIR, wallet, usdc, wmatic, false, false);
    await updatePrices(WETH_USDC_PAIR, wallet, usdc, weth, false, true);

    // Notify downstream
    await publishOne(SNS_BALANCE_REFRESH_COMPLETE!, {});
}


const updatePrices = async (pair: string, wallet: Wallet, 
    tokenA: Token,
    tokenB: Token,
    includeMovingAverages: boolean,
    useToken1ForPrice: boolean
    ) => {

    // Fetch pool and the current price in the pool
    const pool = await getPool(wallet, tokenA, tokenB);
    const price = await getPrice(pool, useToken1ForPrice);

    // Save to the PriceHistory table
    const row = {
        pair: pair,
        price: price.toFixed(PRICE_DECIMALS),
        liquidity: pool.liquidity.toString()
    } as PriceHistoryRow
    await PriceHistoryTable.addRow(row);

    // Update moving averages
    const priceRow = await PriceTable.getPrice(pair)
    const priorAverages = JSON.parse(priceRow.smas ? (priceRow.smas ?? "[]") : "[]")

    let movingAverages = []
    if (includeMovingAverages) {
        movingAverages = computeMovingAverages(price, SMA_FROM, SMA_TO, SMA_STEP, priorAverages)
    }

    // Update the price table
    await PriceTable.updatePrice({
        ...row,
        smas: JSON.stringify(movingAverages)
    })

    // Push the price as a metric to CloudWatch
    await safePushPriceMetric(pair, 0, 0, parseFloat(price.toFixed(PRICE_DECIMALS)));
}



const computeMovingAverages = (price: Price<Token, Token>, from: number, to: number, step: number, prior?: string[]) => {
    const newPrice = parseFloat(price.toFixed(PRICE_DECIMALS));
    let c = 0;
    const updatedAverages = new Array(Math.round((to - from) / step) + 1)

    if (!prior || prior.length !== updatedAverages.length) {
        if (prior) {
            console.log(`Prior length ${prior.length} does not match updated length ${updatedAverages.length}`)
        }
        prior = undefined
    }

    for (let duration = from; duration <= to; duration += step) {
        let priorMA = prior ? parseFloat(prior[c]) : newPrice;
        updatedAverages[c++] = (priorMA + (newPrice - priorMA) / duration).toFixed(2)
    }
    console.log("Price", price.toFixed(PRICE_DECIMALS))
    console.log("Averages", updatedAverages)
    return updatedAverages;
}