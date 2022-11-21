use crate::price::pair_info::PairInfo;
use super::trade_strategy::{TradeStrategy, TradeAction};
use super::account_slice_state::{ AccountSliceState, Side };


pub struct BasicTradeStrategy {
    pub min_return: f32,                // a value like 1.015 represents a 150 basis point return
    pub fee_pct: f32,                   // a value like 1.002 represents a 20 basis point fee+slippage
    pub account: AccountSliceState,

    moving_price_mark: f32,             // a moving average 
    ma_duration: u32,                   // simple moving average duration.  60 = 1hr
}


impl BasicTradeStrategy {

    pub fn new(min_return: f32, ma_duration: u32) -> BasicTradeStrategy {
        let fee_pct = 1.0025;

        return BasicTradeStrategy {
            min_return: min_return,
            fee_pct: fee_pct,
            account: AccountSliceState::default(),
            moving_price_mark: 0.0,
            ma_duration: ma_duration
        }
    }

    fn buy(&mut self, price: f32) {
        // perform a buy by finding the amount of 'top' that can be 
        // purchased with 'bot' given the current price, and reduce it based on the fee %.
        let top_purchase = (self.account.bal_bot / price) / self.fee_pct;
        self.account.bal_top = top_purchase;
        self.account.bal_bot = 0.0;
        self.account.side = Side::SELL;
        // println!("BUY: now holding {} top", top_purchase)
    }

    fn sell(&mut self, price: f32) {
        // perform a sell by finding the amount of 'bot' that can be
        // purchased with 'top' given the current price, and reduce it based on the fee %.
        let bot_purchase = (self.account.bal_top * price) / self.fee_pct;
        self.account.bal_top = 0.0;
        self.account.bal_bot = bot_purchase;
        self.account.side = Side::BUY;
        // println!("SELL: now holding {} bot", bot_purchase)
    }


}


impl TradeStrategy for BasicTradeStrategy {

    /*
        price:  Expressed as top/bot (e.g. ETH/MAT)
     */
    fn process_tick(&mut self, price: f32, _pair: &PairInfo) -> TradeAction {
        let side = &self.account.side;
        
        if self.moving_price_mark == 0.0 {
            self.moving_price_mark = price;
        }

        let mut action = TradeAction::NONE;

        match side {
            Side::BUY => {
                // i.e. in an ETH/MAT pair, MAT is held
                // if the price (of ETH in MAT) has dropped by more than self.min_return
                // then make a trade.
                // println!("price: {}, threshold: {}, side: {:?}", price, self.moving_price_mark / self.min_return, side);

                if price < self.moving_price_mark / self.min_return {
                    self.buy(price);
                    action = TradeAction::BUY;
                }
            },
            Side::SELL => {
                // println!("price: {}, threshold: {}, side: {:?}", price, self.moving_price_mark * self.min_return, side);

                if price > self.moving_price_mark * self.min_return {
                    self.sell(price);
                    action = TradeAction::SELL;
                }
            }
        }
        let mark = self.moving_price_mark;
        self.moving_price_mark = mark + (price - mark) / (self.ma_duration as f32);  // TODO parameterize 60 as part of the strategy
        return action;
    }

    /*
        Return an amount expressed in the 'bot' (bottom) unit
     */
    fn net_worth(&self, price: f32) -> f32 {
        let top_worth = self.account.bal_top * price;
        let bot_worth = self.account.bal_bot;

        return top_worth + bot_worth;
    }

}