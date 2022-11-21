use crate::price::pair_info::{ HasPrice, PairInfo };
use crate::price::pair_series::PairSeries;

pub struct EndlessPairStream<'a>
{
    pub series: &'a PairSeries
}

impl <'a> EndlessPairStream<'a> {

    pub fn iterate<C>(&self, num_iters: u32, mut callback: C, start_idx: u32) where
        C: FnMut(u32, f32, &PairInfo) -> ()
    {  
        /*
        Create an endless price stream that invokes 
        the given callback with each price 'tick'.

        The stream is created by repeatedly iterating across 'self.rows'
        for the given number of iterations.
        */

        let rows = self.series.pairs.as_ref().unwrap();
        let size = rows.len();
        let mut scale = 1.0 as f32;
        let mut idx = (start_idx as usize) % size;
        
        let last_price = (&rows[size - 1]).price();
        let first_price = (&rows[0]).price();

        for i in 0..num_iters {
            if idx % size == 0 && idx > 0 {
                idx = 0;
                scale *= last_price / first_price
            }
            let scaled_price = (&rows[idx]).price() * scale;
            callback(i, scaled_price, &rows[idx]);
            idx += 1;
        }
    }

}
