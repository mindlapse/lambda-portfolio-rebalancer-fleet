use crate::io::csv_file::load_csv;

pub struct PriceSeries {
    pub symbol: String,
    pub prices: Vec<f32>,
}

impl PriceSeries {

    
    pub fn from_csv(symbol: &str, file: &str) -> PriceSeries {
        let file_name = String::from(file);
        let rows = load_csv(file_name).unwrap();
        return PriceSeries {
            symbol: String::from(symbol),
            prices: PriceSeries::extract_opens(rows)
        };
    }

    fn extract_opens(rows: Vec<csv::StringRecord>) -> Vec<f32> {

        let opens_col = 1;
        let mut opens = Vec::with_capacity(rows.len()) as Vec<f32>;
        for row in rows.iter() {
            let open_str = row.get(opens_col).expect("Missing");
            let open = open_str.parse::<f32>().unwrap();
            opens.push(open)
        }
        return opens;
    }
}