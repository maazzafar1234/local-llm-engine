# --- 1. IAM Role for EKS Cluster ---
resource "aws_iam_role" "eks_cluster_role" {
  name = "local-llm-engine-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# --- 2. AWS EKS Cluster ---
resource "aws_eks_cluster" "local_llm_cluster" {
  name     = "local-llm-engine-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.34"

  vpc_config {
    endpoint_public_access = true
    subnet_ids             = data.aws_subnets.default.ids
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

# --- 3. Master EC2 Machine ---
resource "aws_instance" "master_node" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.generated_key.key_name
  availability_zone           = var.availability_zone
  security_groups             = [aws_security_group.local_llm_devops_sg.name]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "local-llm-engine-Master-Machine"
  }
}

# --- 4. Jenkins Worker EC2 Machine ---
resource "aws_instance" "jenkins_worker" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.generated_key.key_name
  availability_zone           = var.availability_zone
  security_groups             = [aws_security_group.local_llm_devops_sg.name]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 29
    volume_type = "gp3"
  }

  tags = {
    Name = "local-llm-engine-Jenkins-Worker"
  }
}

# --- 5. IAM Role & Node Group for EKS Worker Nodes ---
resource "aws_iam_role" "eks_node_role" {
  name = "local-llm-engine-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_ecr_read_only" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_eks_node_group" "local_llm_node_group" {
  cluster_name    = aws_eks_cluster.local_llm_cluster.name
  node_group_name = "local-llm-engine-ng"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = data.aws_subnets.default.ids
  instance_types  = ["t3.small"]

  scaling_config {
    desired_size = 1
    max_size     = 2
    min_size     = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_ecr_read_only,
  ]
}
