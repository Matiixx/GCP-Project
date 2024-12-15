import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { v1 } from "@google-cloud/scheduler";

export const initFirebase = () => {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON ?? "{}");

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
  const db = getFirestore("tempfileshare-firestore");
  const storage = new Storage({
    projectId: "tempfileshare-444110",
    credentials: serviceAccount,
  });

  const schedulerClient = new v1.CloudSchedulerClient({
    projectId: "tempfileshare-444110",
    credentials: serviceAccount,
  });

  return { admin, db, storage, schedulerClient };
};
