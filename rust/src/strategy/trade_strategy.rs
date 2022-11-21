use crate::price::pair_info::PairInfo;

pub trait TradeStrategy {
    fn process_tick(&mut self, price: f32, pair: &PairInfo) -> TradeAction;
    fn net_worth(&self, price: f32) -> f32;
}

pub enum TradeAction {
    BUY,
    SELL,
    NONE
}