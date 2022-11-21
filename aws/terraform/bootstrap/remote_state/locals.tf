locals {
    bucket_prefix = "${var.product}-${var.env}"
    tags = {
        product = var.product
        env = var.env
    }
}