import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fileUpload from "express-fileupload";

import { getFirestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";

import { getUniqueCode } from "./utils";
import { initFirebase } from "./initalizeApp";

dotenv.config();

const app = express();
const port = process.env.PORT;
app.use(cors({ origin: "*" }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));

const { db, storage } = initFirebase();

app.get("/", (req, res) => {
  res.send("Express + TypeScript Server");
});

const FILE_CODES_COLLECTION = "files-codes";
const BUCKET_NAME = "tempfileshare-storage-bucket";

app.post("/upload", async (req, res) => {
  const file = req.files?.file as fileUpload.UploadedFile;

  if (!file) {
    res.sendStatus(400);
    return;
  }

  const duration = req.body.duration ?? "1"; // TODO: Implement scheduler
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
