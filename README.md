# GCP Project

## Temporary File Share App

### Main funtionality

- User can upload a file via the web app, the file will be stored in the Cloud Storage, functions will generate the code connected to the file and store it in the Firestore DB. The code will be delivered to the uploader.
- User can share the file with others (or other devices). Write the code to the specific input field in the app will grant the access to the file.
- User can download the file from the cloud storage via the web app.
- Uploader can set the expiration date of the file. The scheduler will delete the file from the storage and the DB after the expiration date.
- The web app will probably be deployed on the GCP Cloud Run.
