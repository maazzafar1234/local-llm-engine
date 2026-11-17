# Generate a local private key
resource "tls_private_key" "rsa_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register the public key with AWS EC2 in ap-southeast-2
resource "aws_key_pair" "generated_key" {
  key_name   = "eks-nodegroup-key"
  public_key = tls_private_key.rsa_key.public_key_openssh
}

# (Optional) Automatically save the private key pem file to your local machine
resource "local_file" "private_key" {
  content  = tls_private_key.rsa_key.private_key_pem
  filename = "${path.module}/eks-nodegroup-key.pem"
}