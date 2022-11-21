
export enum Side {
    BUY = 'BUY', 
    SELL = 'SELL'
}

export interface PriceRow {
    pair: string
    price: string
    liquidity: string
    created_on?: string
    updated_on?: string
    smas?: string
}

export interface PriceHistoryRow {
    pair: string,
    price: string,
    liquidity: string,
    created_on?: string
}

export interface Agent {
    agent_address: string,
    wallet_index: number,

    ma_init_gain: number,
    ma_duration: number,
    side?: Side

    open_trade_id: string,
    is_active?: boolean,
    balance: number
}


export interface TradePayload {
    uuid: string,
    side: Side,
    agent_address: string,
    current_price: string,
}


export interface SubmittedTradeRow extends TradePayload {
    txn_hash: string
    input_bal: string       // raw
    input_token: string     // symbol (e.g. WETH)
    created_on: string
}

export interface TradeWithReceipt extends SubmittedTradeRow, Omit<UpdateTradeWithReceipt, "uuid"> {
}

export interface SettledTradeWithReceipt extends TradeWithReceipt, Omit<UpdateTradeWithSettledInfo, "uuid"> {
}

export interface UpdateTradeWithReceipt {
    uuid: string,

    to_addr: string,
    txn_block: number,
    txn_idx: number, 
    block_timestamp: number,
    gas: string,
    txn_status: TxnStatus,
}

export interface UpdateTradeWithSettledInfo {
    uuid: string,

    output_bal: string,
    input_price: string,
    output_price: string,
}

export interface TxnLog {
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;

    removed: boolean;

    address: string;
    data: string;

    topics: Array<string>;

    transactionHash: string;
    logIndex: number;
}


export enum TxnType {
    WRAP = "WRAP",
    UNWRAP = "UNWRAP",
    SWAP = "SWAP",
    TRANSFER = "TRANSFER"
}

export enum TxnStatus {
    DROPPED = "DROPPED",
    PENDING = "PENDING",
    APPLIED = "APPLIED",
    REVERTED = "REVERTED",
}


export interface PendingTxn {
    txn_hash: string
    trade_uuid?: string         // optional, not included for wrap/unwrap txns
    agent_address: string
    wallet_index: number
    symbol: string
    amount: string
    created_on: string
    type: TxnType
}

export interface TxnReceipt extends PendingTxn {
    to_addr: string
    txn_block: number,
    txn_idx: number,
    block_timestamp: number,
    gas: string,
    txn_status: TxnStatus
}

export interface TxnReceiptWithLogs extends TxnReceipt {
    logs: TxnLog[]
}
