# n8n channel VM — the ONLY piece of always-on infrastructure in the project.
# Everything else is batch (pipeline), static (Vercel) or scale-to-zero (Cloud Run).
#
# Run this from CLOUD SHELL (terraform is preinstalled and already authenticated):
#   cd deploy && terraform init && terraform apply
# Full call-script: deploy/README.md

terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
}

provider "google" {
  project = var.project
  region  = "asia-south1"
  zone    = "asia-south1-a"
}

variable "project" {
  default = "aq-intelligence"
}

resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

# Static IP: Telegram webhooks point at this. If the VM is ever recreated, the
# address (and therefore the webhook + TLS cert) survives.
resource "google_compute_address" "n8n_ip" {
  name       = "n8n-ip"
  depends_on = [google_project_service.compute]
}

resource "google_compute_firewall" "n8n_web" {
  name    = "n8n-allow-http-https"
  network = "default"
  allow {
    protocol = "tcp"
    ports    = ["80", "443"] # Caddy: 80 for the ACME challenge, 443 for the webhooks
  }
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["n8n"]
}

resource "google_compute_instance" "n8n" {
  name         = "n8n"
  machine_type = "e2-small" # ~$13/mo against the credits; 2GB is comfortable for n8n
  tags         = ["n8n"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.n8n_ip.address
    }
  }

  # Startup installs Docker only. The compose stack is copied and started by hand
  # (deploy/README.md step 4) — baking app config into startup scripts is where
  # these setups fail invisibly, and a 4-command SSH session is easier to debug
  # on a call than a boot log.
  metadata_startup_script = <<-EOT
    #!/bin/bash
    set -e
    apt-get update
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  EOT
}

output "static_ip" {
  value = google_compute_address.n8n_ip.address
}

output "next_step" {
  value = "Point your DuckDNS subdomain at static_ip (deploy/README.md step 2), then continue with step 3."
}
