resource "aws_dynamodb_table" "em_agents" {
  name           = "${local.prefix}_agents"
  billing_mode   = "PAY_PER_REQUEST"
  
  hash_key       = "agent_address"

  attribute {
    name = "agent_address"
    type = "S"
  }

  tags = var.tags
}

resource "aws_dynamodb_table" "em_pending_txn" {
  name           = "${local.prefix}_pending_txn"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "txn_hash"

  attribute {
    name = "txn_hash"
    type = "S"
  }

  tags = var.tags
}

resource "aws_dynamodb_table" "em_txn_history" {
  name           = "${local.prefix}_txn_history"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "txn_hash"

  attribute {
    name = "txn_hash"
    type = "S"
  }

  tags = var.tags
}

resource "aws_dynamodb_table" "em_ledger" {
  name           = "${local.prefix}_ledger"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "txn_hash"

  attribute {
    name = "txn_hash"
    type = "S"
  }

  tags = var.tags
}


resource "aws_dynamodb_table" "em_trades" {
  name           = "${local.prefix}_trades"
  billing_mode   = "PAY_PER_REQUEST"
  
  hash_key       = "uuid"

  attribute {
    name = "uuid"
    type = "S"
  }

  tags = var.tags
}

resource "aws_dynamodb_table" "em_trade_history" {
  name           = "${local.prefix}_trade_history"
  billing_mode   = "PAY_PER_REQUEST"
  
  hash_key       = "uuid"

  attribute {
    name = "uuid"
    type = "S"
  }

  tags = var.tags
}



resource "aws_dynamodb_table" "em_errors" {
  name           = "${local.prefix}_errors"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "created_on"

  attribute {
    name = "created_on"
    type = "S"
  }

  tags = var.tags
}




resource "aws_dynamodb_table" "em_price" {
  name           = "${local.prefix}_price"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pair"

  attribute {
    name = "pair"
    type = "S"
  }

  tags = var.tags
}


resource "aws_dynamodb_table" "em_price_history" {
  name           = "${local.prefix}_price_history"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pair"
  range_key      = "created_on"

  attribute {
    name = "pair"
    type = "S"
  }

  attribute {
    name = "created_on"
    type = "S"
  }

  tags = var.tags
}