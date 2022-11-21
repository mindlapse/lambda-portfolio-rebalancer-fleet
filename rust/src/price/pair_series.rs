
use crate::price::pair_info::PairInfo;


pub struct PairSeries {

    pub pairs: Option<Vec<PairInfo>>
}


impl PairSeries {

    pub fn new<'a>(top: &Vec<f32>, bot: &Vec<f32>) -> PairSeries {
        
        let len = top.len();
        let mut results = Vec::with_capacity(top.len());
        
        for i in 0..len {
            results.push(PairInfo {
                tick: i,
                top_price_usd: *top.get(i).unwrap(),
                bot_price_usd: *bot.get(i).unwrap(),
            });
        }
        return PairSeries {
            pairs: Some(results)
        };
    }
}

