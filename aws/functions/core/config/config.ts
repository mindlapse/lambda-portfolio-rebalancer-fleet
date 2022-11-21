import { getSecret } from '../lib/ssm/ssm';

export type ConfigType = { [key: string]: string };

let config : Config;

const KEY_INFURA_PROJECT_ID = "infura_project_id"
const KEY_NETWORK_ALIAS = "network_alias"
const KEY_MNEMONIC = "mnemonic"
const KEY_TRUSTED_WITHDRAWAL_ADDR = "trusted_withdrawal_addr"

class Config {

    config: ConfigType;

    private constructor(config?: any) {
        if (config) {
            this.config = config;
        } else {
            throw new Error("Undefined config")
        }
    }

    static get = async () => {
        if (!config) {
            try {
                config = new Config(await getSecret('config'));
            } catch (e) {
                console.error("Error loading config", e)
                throw e;
            }
        }
        return config;
    }

    getInfuraProjectId() {
        return this.config[KEY_INFURA_PROJECT_ID];
    }

    getNetwork() {
        return this.config[KEY_NETWORK_ALIAS];
    }
    
    getMnemonic() {
        return this.config[KEY_MNEMONIC];
    }

    getBotIndex(): string {
        return process.env.BOT_INDEX!;
    }

    // The returned value has not been validated.
    // Addresses can be validated with ethers.utils.isAddress( address ) -> boolean
    getTrustedWithdrawalAddress(): string|undefined {
        return this.config[KEY_TRUSTED_WITHDRAWAL_ADDR];
    }

}

export default Config;