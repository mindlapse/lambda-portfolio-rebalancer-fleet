use std::fs::{OpenOptions, File};

use csv::Writer;

use crate::price::threaded_pair_stream::SampleReturnStats;

pub struct SaveResults {
    wtr: Writer<File>
}

impl SaveResults {

    pub fn new(file_name: &str) -> Self {
        let file = OpenOptions::new()
            .write(true)
            .append(true)
            .create_new(true)
            .open(file_name)
            .unwrap();

        let mut wtr = csv::Writer::from_writer(file);
        wtr.write_record(&["min_return", "ma_duration", "samples", "avg_trades", "min", "max", "mean", "stddev"]).unwrap();
    
        SaveResults {
            wtr: wtr
        }
    }

    pub fn save_results(&mut self, rows: Vec<SampleReturnStats>) {


        println!("{}", rows.len());
        for row in rows {
            self.wtr.write_record(&[
                std::format!("{}", row.agent_params.min_return),
                std::format!("{}", row.agent_params.ma_duration),
                std::format!("{}", row.samples),
                std::format!("{:.2}", row.avg_num_trades),
                std::format!("{:.2}", row.min),
                std::format!("{:.2}", row.max),
                std::format!("{:.2}", row.mean),
                std::format!("{:.2}", row.stddev),
            ]).unwrap();
        }
        self.wtr.flush().unwrap();
    }
    
}

