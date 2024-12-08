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
