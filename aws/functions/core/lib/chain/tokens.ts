

import { Token } from '@uniswap/sdk-core'
import { CHAIN_ID, USDC, WETH, WMATIC } from '../constants';
import Addr from './addr';


class Tokens {

    static wmatic(): Token {
        return new Token(CHAIN_ID, Addr.wmatic(), 18, WMATIC).wrapped;
    }

    static weth(): Token {
        return new Token(CHAIN_ID, Addr.weth(), 18, WETH).wrapped;
    }

    static usdc(): Token {
        return new Token(CHAIN_ID, Addr.usdc(), 6, USDC)
    }

}

export default Tokens;