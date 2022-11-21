mod agent;
mod price;
mod io;
mod sim;
mod strategy;

use std::process;
use crate::io::{ 
    save_results::SaveResults
};
use price::{price_series::PriceSeries, pair_series::PairSeries};
use sim::{simulation, SimulationParams};


fn main() {

    let mut output = SaveResults::new("output.csv.txt");

    for ma_steps in 1..100 {
        for min_return_steps in 3..100 {
        
            let min_return = 1.0 + (min_return_steps as f32) * 5.0 / 10000.0;
            let ma_duration = ma_steps * 5;
            
            let eth = &PriceSeries::from_csv("ETH", "../data/ETHUSD_1_norm.csv");
            let mat = &PriceSeries::from_csv("MAT", "../data/MATICUSD_1_norm.csv");
            let pair_series = Box::new(PairSeries::new(&eth.prices, &mat.prices));

            match simulation(SimulationParams {
                min_return: min_return,
                ma_duration: ma_duration,
                num_threads: 32,
                samples_per_thread: 64,
                n_steps: 1*365*24*60,
                pair_series: pair_series
            }) {
                Ok(rows) => { 
                    output.save_results(rows);
                    println!("Complete")
                },
                Err(err) => {
                    println!("{}", err);
                    process::exit(1);
                }
            }
        }
    }


}