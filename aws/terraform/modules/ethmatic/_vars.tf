

variable "env" {
    type = string
    description = "[dev, prod]"
}


variable "product" {
    type = string
    description = "product"
}


variable "tags" {
    type = object({
        product = string
        env = string
    })
    description = "Tags to apply"
}

