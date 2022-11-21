terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.20.1"
    }
  }
  backend "s3" {
    bucket = "em-prod-tfstate-bucket"
    key    = "em/prod/terraform.tfstate"
    region = "ca-central-1"
  }
}

provider "aws" {

  profile = "default"
  region  = "ca-central-1"

}


module "ethmatic" {
    source = "./modules/ethmatic"
    env = "prod"
    product = "em"
    tags = {
        product = "ethmatic"
        env = "prod"
    }
}
