import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const required = [
  "LACE_MINIO_BUCKET",
  "LACE_MINIO_ENDPOINT",
  "LACE_MINIO_REGION",
  "LACE_MINIO_ROOT_ACCESS_KEY",
  "LACE_MINIO_ROOT_SECRET",
];
for (const variable of required) {
  if (process.env[variable] === undefined || process.env[variable].trim().length === 0)
    throw new Error(`Invalid MinIO initializer environment: ${variable}.`);
}

const client = new S3Client({
  credentials: {
    accessKeyId: process.env.LACE_MINIO_ROOT_ACCESS_KEY,
    secretAccessKey: process.env.LACE_MINIO_ROOT_SECRET,
  },
  endpoint: process.env.LACE_MINIO_ENDPOINT,
  forcePathStyle: true,
  region: process.env.LACE_MINIO_REGION,
});

try {
  await client.send(new HeadBucketCommand({ Bucket: process.env.LACE_MINIO_BUCKET }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: process.env.LACE_MINIO_BUCKET }));
}

console.info("Initialized private local MinIO bucket.");
