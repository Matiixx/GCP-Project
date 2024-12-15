import { metricServiceClient, schedulerClient, storage } from "./initalizeApp";

const generateCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export async function getUniqueCode(
  db: FirebaseFirestore.Firestore,
  collection: string
) {
  let code;
  let docRef;
  let doc;

  do {
    code = generateCode();
    docRef = db.collection(collection).doc(code);
    doc = await docRef.get();
  } while (doc.exists);

  return code;
}

export function getDelayedCronSchedule(delayHours: number): string {
  const scheduledTime = new Date();

  const totalMinutes = Math.floor(delayHours * 60);

  scheduledTime.setMinutes(scheduledTime.getMinutes() + totalMinutes);

  const minutes = scheduledTime.getMinutes();
  const hours = scheduledTime.getHours();

  return `${minutes} ${hours} * * *`;
}

export async function writeFileSizeMetric(fileSize: number, fileType: string) {
  const projectId = process.env.PROJECT_ID ?? "";
  const series = {
    metric: {
      type: "custom.googleapis.com/file_size",
      labels: { file_type: fileType },
    },
    resource: { type: "global" },
    points: [
      {
        interval: {
          endTime: { seconds: Math.floor(Date.now() / 1000) },
        },
        value: { int64Value: fileSize },
      },
    ],
  };

  const request = { name: `projects/${projectId}`, timeSeries: [series] };

  try {
    await metricServiceClient.createTimeSeries(request);
    console.log(
      `Successfully recorded file size: ${fileSize} bytes for type: ${fileType}`
    );
  } catch (error) {
    console.error("Error writing time series data:", error);
  }
}

export async function writeDelayMetric(delay: number) {
  const projectId = process.env.PROJECT_ID ?? "";
  const series = {
    metric: { type: "custom.googleapis.com/delay_duration" },
    resource: { type: "global" },
    points: [
      {
        interval: { endTime: { seconds: Math.floor(Date.now() / 1000) } },
        value: { doubleValue: delay },
      },
    ],
  };

  const request = { name: `projects/${projectId}`, timeSeries: [series] };

  try {
    await metricServiceClient.createTimeSeries(request);
    console.log(`Successfully recorded delay: ${delay}`);
  } catch (error) {
    console.error("Error writing time series data:", error);
  }
}

export async function deleteFolder(bucketName: string, folderPrefix: string) {
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

export async function createSchedulerJob(code: string, delay: number) {
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
    schedule: getDelayedCronSchedule(delay),
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
