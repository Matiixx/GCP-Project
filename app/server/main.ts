import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fileUpload from "express-fileupload";

import { getFirestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { CloudSchedulerClient } from "@google-cloud/scheduler";

import { getUniqueCode } from "./utils";
import { initFirebase } from "./initalizeApp";

dotenv.config();

const app = express();
const port = process.env.PORT;
app.use(cors({ origin: "*" }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { db, storage, schedulerClient } = initFirebase();

app.get("/", (_req, res) => {
  res.send("Express + TypeScript Server");
});

const FILE_CODES_COLLECTION = "files-codes";
const BUCKET_NAME = "tempfileshare-storage-bucket";

// export const deleteScheduledFiles = functions.pubsub
//   .schedule('every 1 hours')
//   .onRun(async (context) => {

//     // Find files that are past their expiration time
//     const now = admin.firestore.Timestamp.now();
//     const expiredFilesQuery = await db.collection(FILE_CODES_COLLECTION)
//       .where('expiresAt', '<=', now)
//       .get();

//     const batch = db.batch();
//     const deletePromises = expiredFilesQuery.docs.map(async (doc) => {
//       const fileData = doc.data();
//       const code = doc.id;

//       try {
//         // Delete file from Firebase Storage
//         await storage.bucket(BUCKET_NAME).file(`${code}/${fileData.fileName}`).delete();

//         // Delete document from Firestore
//         batch.delete(doc.ref);
//       } catch (error) {
//         console.error(`Error deleting file ${code}:`, error);
//       }
//     });

//     // Wait for all deletions to complete
//     await Promise.all(deletePromises);

//     // Commit the batch of Firestore deletions
//     return batch.commit();
//   });

async function createSchedulerJob(code: string, delay: number) {
  const projectId = process.env.PROJECT_ID ?? "";
  const locationId = process.env.LOCATION_ID ?? "";
  const locationPath = schedulerClient.locationPath(projectId, locationId);
  const jobName = `${locationPath}/jobs/delete-file-job-${code}`;

  const job = {
    httpTarget: {
      uri: "https://tempfileshare-api-507534501976.europe-central2.run.app/deleteFile",
      httpMethod: "POST",
      body: Buffer.from(JSON.stringify({ code })),
      headers: { "Content-Type": "application/json" },
    },
    schedule: "* * * * *",
    timeZone: "UTC",
    name: jobName,
  } as const;

  const request = {
    parent: schedulerClient.locationPath(projectId, locationId),
    job,
  };

  const [response] = await schedulerClient.createJob(request);
  console.log(`Created job: ${response.name}`);
}

async function deleteFolder(bucketName: string, folderPrefix: string) {
  try {
    const bucket = storage.bucket(bucketName);

    const [files] = await bucket.getFiles({ prefix: folderPrefix });

    if (files.length === 0) {
      console.log(`No files found in folder: ${folderPrefix}`);
      return;
    }

    const deletePromises = files.map((file) => file.delete());

    await Promise.all(deletePromises);

    console.log(`Deleted ${files.length} files in folder: ${folderPrefix}`);
  } catch (error) {
    console.error("Error deleting folder:", error);
    throw error;
  }
}

app.post("/deleteFile", async (req, res) => {
  const code = req.body?.code;
  const projectId = process.env.PROJECT_ID ?? "";
  const locationId = process.env.LOCATION_ID ?? "";
  const locationPath = schedulerClient.locationPath(projectId, locationId);
  const jobName = `${locationPath}/jobs/delete-file-job-${code}`;

  try {
    await deleteFolder(BUCKET_NAME, code);
    await db.collection(FILE_CODES_COLLECTION).doc(code).delete();
    await schedulerClient.deleteJob({ name: jobName });
    console.log(`Deleted job: ${jobName}`);
    res.status(200).send({ message: "File deleted successfully." });
  } catch (error) {
    res.status(500).send({ error: "Failed to delete file." });
  }
});

app.post("/upload", async (req, res) => {
  const file = req.files?.file as fileUpload.UploadedFile;

  if (!file) {
    res.sendStatus(400);
    return;
  }

  const duration = parseInt(req.body.duration ?? "1", 10);
  const fileName = file.name;
  const filePath = file.tempFilePath;

  const code = await getUniqueCode(db, FILE_CODES_COLLECTION);

  const transaction = db.runTransaction(async (transaction) => {
    const uploadedFile = await storage
      .bucket(BUCKET_NAME)
      .upload(filePath, { destination: `${code}/${fileName}`, public: true })
      .then(([file]) => file);

    transaction.set(db.collection(FILE_CODES_COLLECTION).doc(code), {
      file: uploadedFile.publicUrl(),
    });
  });

  try {
    await transaction;
    await createSchedulerJob(code, duration);
    res.send({ code });
  } catch (error) {
    console.error("Transaction failed: ", error);
    res.status(500).send("Error during file upload and document creation.");
  }
});

app.get("/:code", async (req, res) => {
  const code = req.params.code;

  if (!code) {
    res.sendStatus(400);
    return;
  }

  const docRef = db.collection(FILE_CODES_COLLECTION).doc(code);

  if (!docRef) {
    res.sendStatus(500);
    return;
  }

  const doc = await docRef.get();
  const data = doc.data();

  if (!data) {
    res.sendStatus(404);
    return;
  }

  res.send(data);
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
