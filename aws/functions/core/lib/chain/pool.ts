import { ethers } from "ethers";
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { computePoolAddress, FeeAmount, Pool } from '@uniswap/v3-sdk';
import Addr from './addr';
import { Price, Token } from '@uniswap/sdk-core';

// Returns an initialized pool instance
export const getPool = async (wallet: ethers.Wallet, baseToken: Token, mainToken: Token): Promise<Pool> => {

    const poolAddress = await getPoolAddress(baseToken, mainToken);
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, wallet);

    const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()])
    return new Pool(
        baseToken,
        mainToken,
        FeeAmount.LOW,
        slot.sqrtPriceX96.toString(),
        liquidity.toString(),
        slot.tick
    )
}


export const getPoolAddress = async (tokenA: Token, tokenB: Token): Promise<string> => {
    return await computePoolAddress({
        factoryAddress: Addr.poolFactory(),
        tokenA : tokenA,
        tokenB : tokenB,
        fee: FeeAmount.LOW
    })
}


export const getPrice = async (pool: Pool, useToken1ForPrice: boolean): Promise<Price<Token, Token>> => {
    return useToken1ForPrice ? pool.token1Price : pool.token0Price;

}
