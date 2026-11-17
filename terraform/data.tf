# Automatically query the default VPC in ap-southeast-2
data "aws_vpc" "default" {
  default = true
}

# Automatically query subnets belonging to that default VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
