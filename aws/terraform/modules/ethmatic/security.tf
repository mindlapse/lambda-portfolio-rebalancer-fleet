
resource "aws_iam_policy" "config" {
    name = "${local.prefix}_ssm_policy"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{

            Action = [
                "ssm:GetParameter",
                "ssm:PutParameter"
            ]
            Effect = "Allow"
            Sid = ""
            Resource = "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${var.product}/${var.env}/*"

        }]
    })
}

resource "aws_iam_policy" "publish_trade_request" {
    name = "${local.prefix}_publish_trade_request"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{

            Action = ["sns:Publish"]
            Effect = "Allow"
            Resource = [
                aws_sns_topic.trade_request.arn
            ]
        }]
    })
}


resource "aws_iam_policy" "publish_refill_trading_fee" {
    name = "${local.prefix}_publish_refill_trading_fee"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{

            Action = ["sns:Publish"]
            Effect = "Allow"
            Resource = [
                aws_sns_topic.refill_trading_fee.arn
            ]
        }]
    })
}

resource "aws_iam_policy" "balance_refresh_complete" {
    name = "${local.prefix}_balance_refresh_complete"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Action = ["sns:Publish"]
            Effect = "Allow"
            Resource = [
                aws_sns_topic.balance_refresh_complete.arn
            ]
        }]
    })
}

resource "aws_iam_policy" "publish_txn_receipt" {
    name = "${local.prefix}_publish_txn_receipt"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Action = ["sns:Publish"]
            Effect = "Allow"
            Resource = [
                aws_sns_topic.txn_receipt.arn
            ]
        }]
    })
}


resource "aws_iam_policy" "save_em_error" {
    name = "${local.prefix}_save_error"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "SaveEthmaticError"
                Action = [
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_errors.arn
            }
        ]
    })
}

module "iam_policy_pending_txn" {
    source = "github.com/mindlapse/terraform_modules/aws/policies/dynamo_table"
    env = var.env
    product = var.product
    tags = var.tags
    name = "PendingTxn"
    table_arn = aws_dynamodb_table.em_pending_txn.arn
}

module "iam_policy_txn_history" {
    source = "github.com/mindlapse/terraform_modules/aws/policies/dynamo_table"
    env = var.env
    product = var.product
    tags = var.tags
    name = "TxnHistory"
    table_arn = aws_dynamodb_table.em_txn_history.arn
}

module "iam_policy_ledger" {
    source = "github.com/mindlapse/terraform_modules/aws/policies/dynamo_table"
    env = var.env
    product = var.product
    tags = var.tags
    name = "Ledger"
    table_arn = aws_dynamodb_table.em_ledger.arn
}


resource "aws_iam_policy" "save_em_trade" {
    name = "${local.prefix}_save_trade"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "SaveEthmaticTrade"
                Action = [
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_trades.arn
            }
        ]
    })
}

resource "aws_iam_policy" "read_em_trade" {
    name = "${local.prefix}_read_trade"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "ReadEthmaticTrade"
                Action = [
                    "dynamodb:Scan",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_trades.arn
            }
        ]
    })
}


resource "aws_iam_policy" "delete_em_trade" {
    name = "${local.prefix}_delete_trade"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "DeleteEthmaticTrade"
                Action = [
                    "dynamodb:DeleteItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_trades.arn
            }
        ]
    })
}


resource "aws_iam_policy" "put_em_trade_history" {
    name = "${local.prefix}_put_trade_history"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "PutEthmaticTradeHistory"
                Action = [
                    "dynamodb:PutItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_trade_history.arn
            }
        ]
    })
}


resource "aws_iam_policy" "save_em_agent" {
    name = "${local.prefix}_save_agent"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "SaveEthmaticAgent"
                Action = [
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem"
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_agents.arn
            }
        ]
    })
}


resource "aws_iam_policy" "read_em_agent" {
    name = "${local.prefix}_read_em_agent"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "ReadEthmaticAgent"
                Action = [
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:GetItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_agents.arn
            }
        ]
    })
}


resource "aws_iam_policy" "read_em_price" {
    name = "${local.prefix}_read_em_price"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "ReadPrice"
                Action = [
                    "dynamodb:GetItem",
                    "dynamodb:BatchGetItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_price.arn
            }
        ]
    })
}


resource "aws_iam_policy" "rw_em_price" {
    name = "${local.prefix}_price"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "RWPrice"
                Action = [
                    "dynamodb:UpdateItem",
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_price.arn
            }
        ]
    })
}


resource "aws_iam_policy" "rw_em_price_history" {
    name = "${local.prefix}_price_history"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "RWPriceHistory"
                Action = [
                    "dynamodb:PutItem",
                    "dynamodb:Query",
                ]
                Effect = "Allow"
                Resource = aws_dynamodb_table.em_price_history.arn
            }
        ]
    })
}


resource "aws_iam_policy" "read_ssm_config" {
    name = "${local.prefix}_config_policy"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{

            Action = "ssm:GetParameter"
            Effect = "Allow"
            Sid = ""
            Resource = "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${var.product}/${var.env}/*"

        }]
    })
}

resource "aws_iam_policy" "put_cloudwatch_metrics" {
    name = "${local.prefix}_put_cloudwatch_metrics"
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Action = "cloudwatch:PutMetricData"
            Effect = "Allow"
            Sid = ""
            Resource = "*"
        }]
    })
}