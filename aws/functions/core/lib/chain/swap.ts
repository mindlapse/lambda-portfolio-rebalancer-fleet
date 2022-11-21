import { ethers } from 'ethers'
import IUniswapV3PoolState from '@uniswap/v3-core/artifacts/contracts/interfaces/pool/IUniswapV3PoolState.sol/IUniswapV3PoolState.json';
import { SwapRouter } from '@uniswap/router-sdk'
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { computePoolAddress, FeeAmount, Pool, Route, Trade } from '@uniswap/v3-sdk'
import JSBI from 'jsbi';
import Addr from './addr';
import { GasEstimate } from './wallet';

export const swap = async (wallet: ethers.Wallet, tokenIn: Token, amountIn: JSBI, tokenOut: Token, gasMax: GasEstimate) => {

    const poolAddress = await computePoolAddress({
        factoryAddress: Addr.poolFactory(),
        tokenA : tokenIn,
        tokenB : tokenOut,
        fee: FeeAmount.LOW
    })

    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolState.abi, wallet)
    const poolInfo = await poolContract.slot0();
    const liquidity = await poolContract.liquidity();


    const pool = new Pool(tokenIn, tokenOut, FeeAmount.LOW, poolInfo.sqrtPriceX96, liquidity, poolInfo.tick, [])
    const route = new Route( [ pool ], tokenIn, tokenOut );

    const trade = Trade.createUncheckedTrade({
        route: route,
        inputAmount: CurrencyAmount.fromRawAmount(tokenIn, amountIn),
        outputAmount: CurrencyAmount.fromRawAmount(tokenOut, 0),
        tradeType:  TradeType.EXACT_INPUT
    });

    const swapParams = SwapRouter.swapCallParameters(
        trade,
        {
            slippageTolerance: new Percent(20, 10000),
            recipient: wallet.address,
            deadlineOrPreviousBlockhash: JSBI.BigInt(Math.floor(Date.now()/1000 + 60*30)),
        }
    )

    const tx = {
        from: wallet.address,
        to: Addr.swapRouter(),
        data: swapParams.calldata,
    };

    const gasEstimate = await wallet.estimateGas(tx);

    const txnResult = await wallet.sendTransaction({ 
        from: wallet.address,
        to: Addr.swapRouter(),
        data: swapParams.calldata,
        maxFeePerGas: gasMax.maxFeePerGas,
        maxPriorityFeePerGas: gasMax.maxPriorityFeePerGas,
        gasLimit: gasEstimate.mul(120).div(100),  
    })

    console.log("swap txn result", txnResult);
    return txnResult;
}

