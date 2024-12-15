import * as adminFb from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { v1 } from "@google-cloud/scheduler";
import { MetricServiceClient } from "@google-cloud/monitoring";
import dotenv from "dotenv";

dotenv.config();

const initFirebase = () => {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON ?? "{}");

  if (adminFb.apps.length === 0) {
    adminFb.initializeApp({
      credential: adminFb.credential.cert(
        serviceAccount as adminFb.ServiceAccount
      ),
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

  const metricServiceClient = new MetricServiceClient({
    projectId: "tempfileshare-444110",
    credentials: serviceAccount,
  });

  return { admin: adminFb, db, storage, schedulerClient, metricServiceClient };
};

const { admin, db, storage, schedulerClient, metricServiceClient } =
  initFirebase();

export { admin, db, storage, schedulerClient, metricServiceClient };
