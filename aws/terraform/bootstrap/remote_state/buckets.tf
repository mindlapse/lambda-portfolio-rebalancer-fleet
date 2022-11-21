provider "aws" {
    region = "ca-central-1"
}

provider "aws" {
    alias = "sydney"
    region = "ap-southeast-2"
}


/*

Cross-region replication config
Replicates the terraform .tfstate in ca-central-1 (Montreal) to ap-southeast-2 (Sydney)

*/
resource "aws_s3_bucket_replication_configuration" "replication" {
  
    # Must have bucket versioning enabled first
    depends_on = [aws_s3_bucket_versioning.source, aws_s3_bucket_versioning.replica]

    role   = aws_iam_role.replication.arn
    bucket = aws_s3_bucket.source.id

    rule {
        id = "FirstRuleOfReplication"
        delete_marker_replication {
          status = "Disabled"
        }

        filter {}

        status = "Enabled"

        destination {
            bucket        = aws_s3_bucket.replica.arn
            storage_class = "STANDARD_IA"
        }
    }
}




/*
ca-central-1 source resources

    - aws_s3_bucket.source
    - aws_s3_bucket_acl.source
    - aws_s3_bucket_versioning.source

*/

resource "aws_s3_bucket" "source" {
    bucket = "${local.bucket_prefix}-tfstate-bucket"
    force_destroy = false

    tags = local.tags
}
resource "aws_s3_bucket_acl" "source" {
    bucket = aws_s3_bucket.source.id
    acl = "private"
}
resource "aws_s3_bucket_versioning" "source" {
    bucket = aws_s3_bucket.source.id
    versioning_configuration {
        status = "Enabled"
    }
}
resource "aws_s3_bucket_public_access_block" "source" {
  bucket = aws_s3_bucket.source.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "source" {
  bucket = aws_s3_bucket.source.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "AES256"
    }
  }
}




/* 
us-southeast-2 replica resources 

    - aws_s3_bucket.replica
    - aws_s3_bucket_acl.replica
    - aws_s3_bucket_versioning.replica
*/

resource "aws_s3_bucket" "replica" {
    provider = aws.sydney
    bucket = "${local.bucket_prefix}-tfstate-ca-central-1-replica"
    force_destroy = false

    tags = {
        product = var.product
        env = var.env
    }
}
resource "aws_s3_bucket_acl" "replica" {
    provider = aws.sydney
    bucket = aws_s3_bucket.replica.id
    acl = "private"
}
resource "aws_s3_bucket_versioning" "replica" {
    provider = aws.sydney
    bucket = aws_s3_bucket.replica.id
    versioning_configuration {
        status = "Enabled"
    }
}
resource "aws_s3_bucket_public_access_block" "replica" {
    provider = aws.sydney
    bucket = aws_s3_bucket.replica.id

    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "replica" {
    provider = aws.sydney
    bucket = aws_s3_bucket.replica.bucket

    rule {
        apply_server_side_encryption_by_default {
            sse_algorithm     = "AES256"
        }
    }
}