import { BigNumber } from 'ethers'
import axios from 'axios'
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import Config from '../../config/config'

export const getWallet = async (walletIndex: number, config: Config) => {
    const ethers = await import('ethers');

    const provider = new ethers.providers.InfuraProvider(
        config.getNetwork(), 
        config.getInfuraProjectId()
    );
    const wallet = ethers.Wallet.fromMnemonic(
        config.getMnemonic(), 
        getDerivationPath(walletIndex)
    );

    return wallet.connect(provider);
}

const getDerivationPath = (index: number) => {
    return `m/44'/60'/0'/0/${index}`
}


export interface GasEstimate {
    maxFeePerGas: BigNumber,
    maxPriorityFeePerGas: BigNumber,
}


export const calcGas = async () => {
    // let gas = {
    //     maxFeePerGas: ethers.BigNumber.from(500000000000),
    //     maxPriorityFeePerGas: ethers.BigNumber.from(40000000000)
    // };
    let gas = {} as GasEstimate
    const { data } = await axios({
        method: 'get',
        url: 'https://gasstation-mainnet.matic.network/v2'
    });
    console.log("Gas estimate", data);
    gas.maxFeePerGas = parseUnits(data.fast.maxFee.toFixed(2), 'gwei');
    gas.maxPriorityFeePerGas = parseUnits(data.fast.maxPriorityFee.toFixed(2), 'gwei');
    return gas;
};


export const isGasAcceptable = (gasEstimate: GasEstimate) => {
    const acceptable = gasEstimate.maxFeePerGas.add(gasEstimate.maxPriorityFeePerGas).lt(parseUnits('444', 'gwei'))

    if (!acceptable) {
        console.log('Gas too high. ' +
            `Base Fee ${formatUnits(gasEstimate.maxFeePerGas, 'gwei')}. ` +
            `Prio Fee ${formatUnits(gasEstimate.maxPriorityFeePerGas, 'gwei')}`);
    }
    return acceptable;
}


export const gasAsGwei = (gasEstimate: GasEstimate): string => {
    return formatUnits(gasEstimate.maxFeePerGas.add(gasEstimate.maxPriorityFeePerGas), 'gwei');
}
