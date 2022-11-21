use std::error::Error;

use crate::{price::threaded_pair_stream::SampleReturnStats, agent::agent_params::AgentParams};
use crate::price::threaded_pair_stream::ThreadedEndlessPairStream;
use crate::price::pair_series::PairSeries;

pub struct SimulationParams {
    pub min_return: f32,
    pub ma_duration: u32,
    pub num_threads: u32,
    pub samples_per_thread: u32,
    pub n_steps: u32,
    pub pair_series: Box<PairSeries>,
}


pub fn simulation(params: SimulationParams) -> Result<Vec<SampleReturnStats>, Box<dyn Error>> {

    let tep_stream = ThreadedEndlessPairStream::create(params.pair_series);

    let sample_returns = tep_stream.sample_returns(
        params.num_threads,
        params.samples_per_thread, 
        params.n_steps, 
        AgentParams::new(params.min_return, params.ma_duration)
    );

    Ok(sample_returns)
}
