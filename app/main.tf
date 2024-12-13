terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      version = "6.12.0"
    }
  }
}

provider "google" {
  project = "tempfileshare-444110"
  region = "europe-central2"
  zone = "europe-central2-a"
}

resource "google_project_service" "iam_api" {
  project = "tempfileshare-444110"
  service = "iam.googleapis.com"
}

resource "google_project_service" "cloud_resource_manager_api" {
  project = "tempfileshare-444110"
  service = "cloudresourcemanager.googleapis.com"
}

resource "google_firestore_database" "database" {
  project     = "tempfileshare-444110"
  name        = "tempfileshare-firestore"
  location_id = "europe-central2"
  type        = "FIRESTORE_NATIVE"
}

resource "google_service_account" "tempfileshare_service_account" {
  account_id   = "tempfileshare-service-account"
  display_name = "Tempfileshare Service Account"
  description  = "Service account for Tempfileshare"
}

resource "google_project_iam_member" "service_account_role_datastore" {
  project = "tempfileshare-444110"
  role = "roles/datastore.owner"
  member = "serviceAccount:${google_service_account.tempfileshare_service_account.email}"
}

resource "google_project_iam_member" "service_account_role_firebase" {
  project = "tempfileshare-444110"
  role = "roles/firebase.admin"
  member = "serviceAccount:${google_service_account.tempfileshare_service_account.email}"
}

resource "google_project_iam_member" "service_account_role_storage" {
  project = "tempfileshare-444110"
  role = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.tempfileshare_service_account.email}"
}

resource "google_storage_bucket" "tempfileshare_storage_bucket" {
  name = "tempfileshare-storage-bucket"
  location = "europe-central2"

  cors {
    origin = ["*"]
    method = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_cloud_run_v2_service" "tempfileshare_cloud_run_service" {
  name = "tempfileshare-cloud-run-service"
  location = "europe-central2"
  client   = "terraform"

  template {
    containers{
      image = "docker.io/cichostepski/tempfile-share:0.0.2"
    }
  }
}


resource "google_cloud_run_v2_service_iam_member" "noauth" {
  location = google_cloud_run_v2_service.tempfileshare_cloud_run_service.location
  name     = google_cloud_run_v2_service.tempfileshare_cloud_run_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_secret_manager_secret" "firestore_secret" {
  secret_id = "firestore-credentials"
  
  replication {
    user_managed {
      replicas {
        location = "europe-central2"
      }
    }
  }
}

resource "google_secret_manager_secret_version" "firestore_secret_version" {
  secret = google_secret_manager_secret.firestore_secret.id
  
  secret_data = file("secret.json")
}

resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  secret_id = google_secret_manager_secret.firestore_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.tempfileshare_service_account.email}"
}

resource "google_cloud_run_v2_service" "tempfileshare_api" {
  name     = "tempfileshare-api"
  location = "europe-central2"

  template {
      containers {
        image = "docker.io/cichostepski/tempfile-share-api:latest"
        
        env {
          name = "SERVICE_ACCOUNT_JSON"
          value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.firestore_secret.secret_id
            version = "latest"
          }
        }
        }
      }
  }
}

resource "google_cloud_run_v2_service_iam_member" "noauth-api" {
  location = google_cloud_run_v2_service.tempfileshare_api.location
  name     = google_cloud_run_v2_service.tempfileshare_api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  project   = "tempfileshare-444110"
  secret_id = google_secret_manager_secret.firestore_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:507534501976-compute@developer.gserviceaccount.com"
}