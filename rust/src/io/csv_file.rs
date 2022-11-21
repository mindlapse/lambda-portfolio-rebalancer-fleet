use std::error::Error;
use std::fs::File;

pub fn load_csv(path: String) -> Result<Vec<csv::StringRecord>, Box<dyn Error>> {
    
    let file = File::open(path)?;
    let mut rdr = csv::Reader::from_reader(file);
    let mut rows = vec![];
    for result in rdr.records() {
        let record = result?;
        // println!("{:?}", record);
        rows.push(record);
    }
    Ok(rows)
}
