use std::marker::Copy;

#[derive(Debug, Clone, Copy)]
pub struct AgentParams {
    pub min_return: f32,
    pub ma_duration: u32
}

impl AgentParams {

    pub fn new(min_return: f32, ma_duration: u32) -> AgentParams {
        return AgentParams {
            min_return: min_return,
            ma_duration: ma_duration
        }
    }

}