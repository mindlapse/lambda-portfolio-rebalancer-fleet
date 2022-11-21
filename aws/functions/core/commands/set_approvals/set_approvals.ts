import Config from "../../config/config"
import { ethers } from "ethers";
import { AgentTable } from "../../db/agents";
import IERC20 from '@openzeppelin/contracts/build/contracts/IERC20.json'
import Addr from "../../lib/chain/addr";
import { Interface } from "ethers/lib/utils";
import { toHex } from "@uniswap/v3-sdk";
import JSBI from "jsbi";
import { calcGas, gasAsGwei, getWallet, isGasAcceptable } from "../../lib/chain/wallet";

interface Payload {
    only_addresses?: string[]
    revoke?: boolean
}


export default async (payload: Payload, config: Config) => {
    
    // Load agents, filtered acccording to the payload
    let agents = await AgentTable.loadAll();
    if (payload.only_addresses) {
        agents = agents.filter(a => payload.only_addresses!.indexOf(a.agent_address) >= 0)
    }

    const revoke = payload.revoke ?? false;
    for (let agent of agents) {
        const wallet = await getWallet(agent.wallet_index, config)
        await setApprovalForSwaps(wallet, Addr.weth(), revoke)
        await setApprovalForSwaps(wallet, Addr.wmatic(), revoke)
    }
}


async function setApprovalForSwaps(wallet: ethers.Wallet, tokenAddr: string, revoke: boolean) {

    // Don't bother if gas is too high
    const gas = await calcGas();
    if (!isGasAcceptable(gas)) {
        throw Error(`gas too high ${gasAsGwei(gas)}`);
    }

    // If allowance is already set, return early
    const tokenContract = new ethers.Contract(tokenAddr, IERC20.abi, wallet)
    const allowance = await tokenContract.allowance(wallet.address, Addr.swapRouter())
    if (revoke && allowance.eq(0) || !revoke && allowance.gt(0)) {
        console.log(`No action needed on wallet ${wallet.address} for token ${tokenAddr}`)
        return;
    }

    // Create the approval transaction
    const ERC20_INTERFACE = new Interface(IERC20.abi)
    const approveData = ERC20_INTERFACE.encodeFunctionData('approve', 
        [Addr.swapRouter(), toHex(JSBI.BigInt(revoke ? 0 : ethers.constants.MaxUint256))])
    
    const approveTx = {
        from: wallet.address,
        to: tokenAddr,
        data: approveData
    }

    // Send transaction
    const gasEstimate = await wallet.estimateGas(approveTx)
    const txn = await wallet.sendTransaction({
        ...approveTx,
        maxFeePerGas: gas.maxFeePerGas,
        maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        gasLimit: gasEstimate.mul(120).div(100),  
    })
    console.log(
        `${revoke ? 'revoking' : 'setting'} approval to ${tokenAddr} in ` +
        `txn ${txn.hash} for ${wallet.address} to ${Addr.swapRouter()}`
    );

    const receipt = await txn.wait();
    console.log("receipt", receipt);

}
