use average::{ Mean, Variance, Min, Max, Estimate };
use rand::{SeedableRng, RngCore};

use crate::agent::agent::Agent;
use crate::agent::agent_params::AgentParams;
use crate::price::{ 
    pair_info::PairInfo,
    pair_series::PairSeries, 
    price_stream::EndlessPairStream
};

use std::sync::{mpsc, Arc};
use std::thread;

pub struct ThreadedEndlessPairStream {
    pair_series: Box<PairSeries>
}

#[derive(Debug)]
pub struct SampleReturnStats {
    pub agent_params: AgentParams,
    pub avg_num_trades: f64,
    pub samples: u32,

    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub stddev: f64,
}

impl ThreadedEndlessPairStream {

    pub fn create(pair_series: Box<PairSeries>) -> ThreadedEndlessPairStream {
        return ThreadedEndlessPairStream {
            pair_series: pair_series
        };
    }

    pub fn sample_returns(self, 
        num_threads: u32, 
        samples_per_thread: u32, 
        n_steps: u32, 
        agent_params: AgentParams
    ) -> Vec<SampleReturnStats> {

        // create num_threads threads.  Each thread then performs 
        // passes_per_thread passes, each n_steps in length, each 
        // starting from a uniformly random position within the 
        // underlying Vec[T] used by the EndlessPairStream.

        let (tx, rx) = mpsc::channel::<SampleReturnStats>();
        let pair_series_arc = Arc::new(self.pair_series);
        let agent_params_arc = Arc::new(agent_params);

        for _ in 0..num_threads {
            // let agent_clone = 
            let pair_series_clone = Arc::clone(&pair_series_arc);
            let agent_params_clone = Arc::clone(&agent_params_arc);
            let tx_clone = tx.clone();

            thread::spawn(move || {
                let mut rng = rand::rngs::StdRng::from_entropy();
                let mut sim_returns = vec![];
                for _ in 0..samples_per_thread {
                    let pair_stream = EndlessPairStream { 
                        series: pair_series_clone.as_ref()
                    };

                    let mut agent = Agent::new(agent_params_clone.as_ref());
        
                    pair_stream.iterate(n_steps,
                        |idx: u32, scaled_price: f32, pair: &PairInfo| {
                        // println!("{} scaled: {}, eth: {}, mat: {}", idx, scaled_price, pair.top_price_usd, pair.bot_price_usd);
                            agent.handle(idx, scaled_price, pair);
                        },
                        rng.next_u32());

                    sim_returns.push((agent.net_worth(), agent.trades()));
                }

                let mut mean = Mean::new();
                let mut trades_mean = Mean::new();
                let mut variance = Variance::new();
                let mut min = Min::new();
                let mut max = Max::new();

                for sim_return in sim_returns {
                    let (nw, t) = sim_return;
                    let net_worth = nw as f64;
                    let trades = t as f64;

                    mean.add(net_worth);
                    variance.add(net_worth);
                    min.add(net_worth);
                    max.add(net_worth);
                    trades_mean.add(trades);
                }
                
                let stats = SampleReturnStats {
                    agent_params: agent_params,
                    samples: samples_per_thread,
                    max: max.max(),
                    min: min.min(),
                    mean: mean.mean(),
                    stddev: variance.sample_variance().sqrt(),
                    avg_num_trades: trades_mean.mean(),
                };
                println!("min_return {:.4}, ma_duration {:.2}, trades: {:.2}, stddev: {:.3} return {:.3}",
                    agent_params.min_return, 
                    agent_params.ma_duration,
                    stats.avg_num_trades,
                    stats.mean,
                    stats.stddev
                );

                tx_clone.send(stats).unwrap();
                drop(tx_clone);
            });
        }
        drop(tx);

        let mut results = vec![];
        for received in rx {
            results.push(received);
        }
        results
    }
    
}