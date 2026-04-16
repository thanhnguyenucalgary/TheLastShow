# --- PROVIDER & INSTANCE ---
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # Good choice for 2026
    }
  }
}

provider "aws" {
  region = "ca-west-1"
  # Note: Terraform will automatically use the Admin profile you
  # set up via 'aws configure'. No keys needed here!
}

resource "aws_instance" "k3s_node" {
  ami           = "ami-00d7b58842d67840a" # Amazon Linux 2 in ca-west-1, good for k3s
  instance_type = "t3.small"

  instance_market_options {
    market_type = "spot"
  }

  user_data = <<-EOF
              #!/bin/bash
              curl -sfL https://get.k3s.io | sh -
              EOF

  iam_instance_profile   = aws_iam_instance_profile.last_show_profile.name
  vpc_security_group_ids = [aws_security_group.last_show_sg.id]
  key_name               = "the-last-show" # Make sure to create this key pair in AWS Console

  tags = { Name = "K3s-FastAPI-Server" }
}

# --- NETWORKING (STRICTER) ---
resource "aws_security_group" "last_show_sg" {
  name = "last-show-sg"

  # Port 80 for the React Frontend
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Port 8000 for your FastAPI Backend
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort for Kubernetes Service exposure
  ingress {
    from_port   = 30791
    to_port     = 30791
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Port 22 (SSH) - BEST PRACTICE: Change this to your specific IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Replace with "YOUR_IP/32" for safety
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- DATABASE ---
resource "aws_dynamodb_table" "obituaries" {
  name         = "obituaries-thanh-nguyen"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_ssm_parameter" "cloudinary_url" {
  name  = "/last-show/cloudinary_url"
  type  = "SecureString"
  value = "PlaceholderValue" # Set a dummy value here, real value will be injected via GitHub Actions

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "google_api_key" {
  name  = "/last-show/google_api_key"
  type  = "SecureString"
  value = "PlaceholderValue" # Set a dummy value here, real value will be injected via GitHub Actions

  lifecycle {
    ignore_changes = [value]
  }
}

# --- IAM ROLE (THE SERVER'S IDENTITY) ---
resource "aws_iam_role" "ec2_role" {
  name = "last_show_ec2_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "last_show_permissions" {
  name = "LastShowProjectPermissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["polly:SynthesizeSpeech"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"] # Simplified for dev, can be specific later
        Resource = aws_dynamodb_table.obituaries.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:ca-west-1:*:parameter/last-show/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_permissions" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.last_show_permissions.arn
}

resource "aws_iam_instance_profile" "last_show_profile" {
  name = "last_show_instance_profile"
  role = aws_iam_role.ec2_role.name
}