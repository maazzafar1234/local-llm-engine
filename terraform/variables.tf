variable "aws_region" {
  default = "ap-southeast-2"
}

variable "availability_zone" {
  default = "ap-southeast-2a"
}

variable "instance_type" {
  default = "m7i-flex.large"
}

variable "ami_id" {
  description = "Specified custom AMI ID"
  default     = "ami-0ba218121447b72f3"
}

variable "key_name" {
  default = "eks-nodegroup-key"
}
