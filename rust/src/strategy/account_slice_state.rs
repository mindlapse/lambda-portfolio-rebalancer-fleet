
#[derive(Debug)]
pub enum Side {
    BUY,        // when on bottom
    SELL        // when on top
}

pub struct AccountSliceState { 
    pub bal_top: f32,
    pub bal_bot: f32,
    pub side: Side,

}
impl AccountSliceState {

    pub fn default() -> AccountSliceState {
        return AccountSliceState {
            bal_top: 0.0,
            bal_bot: 1000.0,
            side: Side::BUY,
        }
    }
}
