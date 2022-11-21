
resource "aws_sns_topic" "trade_request" {
    name = "${local.prefix}_trade_request.fifo"
    fifo_topic = true
    content_based_deduplication = true
    tags = var.tags
}


resource "aws_sns_topic" "topic" {
    name = "${local.prefix}_trade_receipt.fifo"
    fifo_topic = true
    content_based_deduplication = true
    tags = var.tags
}

resource "aws_sns_topic" "balance_refresh_complete" {
    name = "${local.prefix}_balance_refresh_complete.fifo"
    fifo_topic = true
    content_based_deduplication = true
    tags = var.tags
}

resource "aws_sns_topic" "refill_trading_fee" {
    name = "${local.prefix}_refill_trading_fee.fifo"
    fifo_topic = true
    content_based_deduplication = true
    tags = var.tags
}

resource "aws_sns_topic" "txn_receipt" {
    name = "${local.prefix}_txn_receipt.fifo"
    fifo_topic = true
    content_based_deduplication = true
    tags = var.tags
}




module "save_trade" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_save_trade"
    function_timeout = 120
    lambda_policies = []
    environment = {
        COMMAND = "save_trade"
        TABLE_SAVE_TRADE = aws_dynamodb_table.em_trades.name
    }
    sns_topic_arn = aws_sns_topic.topic.arn
    sns_filter_policy = null
    fifo = true
}


module "save_agent" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_save_agent"
    function_timeout = 120
    lambda_policies = []
    environment = {
        COMMAND = "save_agent"
        TABLE_SAVE_AGENT = aws_dynamodb_table.em_agents.name
    }
    sns_topic_arn = aws_sns_topic.topic.arn
    sns_filter_policy = null
    fifo = true
}


module "create_agents" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_create_agents"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.save_em_agent.arn
    ]
    environment = {
        COMMAND = "create_agents"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
    }
    # sns_topic_arn = aws_sns_topic.topic.arn
    sns_filter_policy = null
    fifo = true
}


module "refresh_moving_averages" {
    source = "github.com/mindlapse/terraform_modules/aws/scheduled_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    image_version = "prod"
    function_name = "refresh_moving_averages"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.rw_em_price.arn,
        aws_iam_policy.rw_em_price_history.arn,
        aws_iam_policy.balance_refresh_complete.arn,
        aws_iam_policy.put_cloudwatch_metrics.arn,
    ]
    environment = {
        COMMAND = "refresh_moving_averages"
        TABLE_PRICE = aws_dynamodb_table.em_price.name
        TABLE_PRICE_HISTORY = aws_dynamodb_table.em_price_history.name
        SNS_BALANCE_REFRESH_COMPLETE = aws_sns_topic.balance_refresh_complete.arn
    }
    schedule_expression = "rate(1 minute)"
    # sns_topic_arn = aws_sns_topic.topic.arn
    fifo = false
}

module "load_agents" {
    depends_on = [
      aws_sns_topic.balance_refresh_complete
    ]
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_load_agents"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_price.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.publish_trade_request.arn,
        aws_iam_policy.save_em_trade.arn,
        aws_iam_policy.save_em_agent.arn,
        aws_iam_policy.put_cloudwatch_metrics.arn,
    ]
    environment = {
        COMMAND = "load_agents"
        TABLE_PRICE = aws_dynamodb_table.em_price.name
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TABLE_TRADES = aws_dynamodb_table.em_trades.name
        SNS_TRADE_REQUEST = aws_sns_topic.trade_request.arn
    }
    sns_topic_arn = aws_sns_topic.balance_refresh_complete.arn
    sns_filter_policy = null
    fifo = true
}

module "make_trade" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_make_trade"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_price.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.save_em_trade.arn,
        aws_iam_policy.save_em_error.arn,
        aws_iam_policy.save_em_agent.arn,
        module.iam_policy_pending_txn.save_arn,
    ]
    environment = {
        COMMAND = "make_trade"
        TABLE_PRICE = aws_dynamodb_table.em_price.name
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TABLE_TRADES = aws_dynamodb_table.em_trades.name
        TABLE_ERRORS = aws_dynamodb_table.em_errors.name
        TABLE_PENDING_TXN = aws_dynamodb_table.em_pending_txn.name
    }
    sns_topic_arn = null # aws_sns_topic.balance_refresh_complete.arn
    sns_filter_policy = null
    fifo = false
}


module "set_activation" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_set_activation"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.save_em_agent.arn
    ]
    environment = {
        COMMAND = "set_activation"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
    }
    sns_topic_arn = null
    sns_filter_policy = null
    fifo = true
}

module "refill_trading_fees" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_refill_trading_fees"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.publish_refill_trading_fee.arn
    ]
    environment = {
        COMMAND = "refill_trading_fees"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TOPIC_ARN_REFILL_TRADING_FEE = aws_sns_topic.refill_trading_fee.arn
    }
    sns_topic_arn = null
    sns_filter_policy = null
    fifo = true
}

module "refill_trading_fee" {
    depends_on = [
      aws_sns_topic.refill_trading_fee
    ]
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_refill_trading_fee"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
    ]
    environment = {
        COMMAND = "refill_trading_fee"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        # TOPIC_ARN_REFILL_TRADING_FEE = aws_sns_topic.refill_trading_fee.arn
    }
    sns_topic_arn = aws_sns_topic.refill_trading_fee.arn
    sns_filter_policy = null
    fifo = true
}

module "refresh_balances" {
    source = "github.com/mindlapse/terraform_modules/aws/scheduled_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    image_version = var.env
    function_name = "refresh_balances"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.save_em_agent.arn,
    ]
    environment = {
        COMMAND = "refresh_balances"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        # TOPIC_ARN_REFILL_TRADING_FEE = aws_sns_topic.refill_trading_fee.arn
    }
    schedule_expression = "rate(1 day)"
    # sns_topic_arn = null
    # sns_filter_policy = null
    fifo = false
}


module "settle" {
    source = "github.com/mindlapse/terraform_modules/aws/scheduled_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    image_version = var.env
    function_name = "settle"
    function_timeout = 240
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,

        module.iam_policy_pending_txn.read_arn,
        module.iam_policy_pending_txn.delete_arn,

        # aws_iam_policy.read_em_trade.arn,
        aws_iam_policy.save_em_trade.arn,

        # module.iam_policy_txn_history.save_arn,
        aws_iam_policy.publish_txn_receipt.arn
    ]
    environment = {
        COMMAND = "settle"
        TABLE_TRADES = aws_dynamodb_table.em_trades.name
        TABLE_PENDING_TXN = aws_dynamodb_table.em_pending_txn.name
        SNS_ARN_TXN_RECEIPT = aws_sns_topic.txn_receipt.arn
    }
    schedule_expression = "rate(30 minutes)"
    # sns_topic_arn = null
    # sns_filter_policy = null
    fifo = false
}


module "settle_trades" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_settle_trades"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,

        aws_iam_policy.read_em_trade.arn,
        aws_iam_policy.save_em_trade.arn,

        aws_iam_policy.read_em_price.arn,

        aws_iam_policy.save_em_agent.arn,
        aws_iam_policy.read_em_agent.arn,

        module.iam_policy_ledger.save_arn,
    ]
    environment = {
        COMMAND = "settle_trades"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TABLE_PRICE = aws_dynamodb_table.em_price.name
        TABLE_LEDGER = aws_dynamodb_table.em_ledger.name
        TABLE_TRADES = aws_dynamodb_table.em_trades.name
        # TABLE_TRADE_HISTORY = aws_dynamodb_table.em_trade_history.name

        # TOPIC_ARN_REFILL_TRADING_FEE = aws_sns_topic.refill_trading_fee.arn
    }
    sns_topic_arn = aws_sns_topic.txn_receipt.arn
    sns_filter_policy = jsonencode({ type = ["SWAP"] })
    fifo = true
}


module "settle_wraps" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_settle_wraps"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_price.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.save_em_agent.arn,
        module.iam_policy_ledger.save_arn,
    ]
    environment = {
        COMMAND = "settle_wraps"
        TABLE_PRICE = aws_dynamodb_table.em_price.name
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TABLE_LEDGER = aws_dynamodb_table.em_ledger.name
    }
    sns_topic_arn = aws_sns_topic.txn_receipt.arn
    sns_filter_policy = jsonencode({ type = ["WRAP", "UNWRAP"] })
    fifo = true
}


module "wrap" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_wrap"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.read_em_price.arn,
        module.iam_policy_pending_txn.save_arn
    ]
    environment = {
        COMMAND = "wrap"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TABLE_PENDING_TXN = aws_dynamodb_table.em_pending_txn.name
    }
    sns_topic_arn = null
    sns_filter_policy = null
    fifo = true
}


module "unwrap" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_unwrap"
    function_timeout = 120
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
        aws_iam_policy.read_em_price.arn,
        module.iam_policy_pending_txn.save_arn
    ]
    environment = {
        COMMAND = "unwrap"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
        TABLE_PRICE = aws_dynamodb_table.em_price.name
        TABLE_PENDING_TXN = aws_dynamodb_table.em_pending_txn.name
    }
    sns_topic_arn = null
    sns_filter_policy = null
    fifo = true
}


module "sweep" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_sweep"
    function_timeout = 900
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
    ]
    environment = {
        COMMAND = "sweep"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
    }
    sns_topic_arn = null
    sns_filter_policy = null
    fifo = true
}

module "set_approvals" {
    source = "github.com/mindlapse/terraform_modules/aws/sqs_lambda"
    env = var.env
    product = var.product
    tags = var.tags
    image_name = aws_ecr_repository.ecr.name
    function_name = "${local.prefix}_set_approvals"
    function_timeout = 900
    lambda_policies = [
        aws_iam_policy.read_ssm_config.arn,
        aws_iam_policy.read_em_agent.arn,
    ]
    environment = {
        COMMAND = "set_approvals"
        TABLE_AGENTS = aws_dynamodb_table.em_agents.name
    }
    sns_topic_arn = null
    sns_filter_policy = null
    fifo = true
}
