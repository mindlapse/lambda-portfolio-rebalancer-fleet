use crate::agent::agent_params::AgentParams;
use crate::price::pair_info::PairInfo;
use crate::strategy::trade_strategy::{ TradeStrategy, TradeAction };
use crate::strategy::basic_trade_strategy::{ BasicTradeStrategy };


pub struct Agent {
    trade_strategy: BasicTradeStrategy,

    last_known_price: f32,
    trades: u32,
}

impl Agent {

    pub fn new(params: &AgentParams) -> Agent {
        return Agent {
            trade_strategy: BasicTradeStrategy::new(params.min_return, params.ma_duration),
            last_known_price: 0.0,
            trades: 0
        };
    }

    pub fn handle(&mut self, _idx: u32, scaled_price: f32, pair: &PairInfo) {
        let trade_action = self.trade_strategy.process_tick(scaled_price, pair);
        
        match trade_action {
            TradeAction::BUY => self.trades += 1,
            TradeAction::SELL => self.trades += 1,
            TradeAction::NONE => (),
        }

        self.last_known_price = scaled_price;
    }

    pub fn net_worth(&self) -> f32 {
        self.trade_strategy.net_worth(self.last_known_price)
    }

    pub fn trades(&self) -> u32 {
        self.trades
    }

}
