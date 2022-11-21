
pub struct PairInfo {
    pub tick: usize,
    pub top_price_usd: f32,
    pub bot_price_usd: f32,
}

pub trait HasPrice {
    fn price(&self) -> f32;
}

impl HasPrice for PairInfo {
    
    fn price(&self) -> f32 {
        return self.top_price_usd / self.bot_price_usd;
    }
}
