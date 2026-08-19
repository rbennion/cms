import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Document storage — certification attachments and waiver PDFs.
//
// Two backends behind one interface. Setting S3_ENDPOINT selects S3 (MinIO on
// our own hardware); with it unset, calls fall through to Vercel Blob. That
// matters because `main` deploys straight to production on Vercel, so this has
// to keep working there while the self-hosted environments are being built.
// Once the move is finished, the Vercel half comes out.
//
// Object keys are the paths already recorded in the database ("documents/…",
// "waivers/…"). Nothing about stored paths changes between backends.

const BUCKET = process.env.S3_BUCKET;

export const usingS3 = () => !!process.env.S3_ENDPOINT;

let client = null;

function getClient() {
  if (!client) {
    const endpoint = process.env.S3_ENDPOINT;
    if (!endpoint || !BUCKET) {
      throw new Error("Storage is not configured (S3_ENDPOINT / S3_BUCKET)");
    }
    client = new S3Client({
      endpoint,
      // Region is meaningless to MinIO but the SDK insists on one.
      region: process.env.S3_REGION || "us-east-1",
      // MinIO addresses buckets as a path segment, not a subdomain.
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

// Loaded lazily so the Vercel SDK is never pulled in once S3 is the backend.
async function blob() {
  return import("@vercel/blob");
}

// Stores an object and returns its path, matching the previous put() contract.
export async function put(pathname, body, { contentType } = {}) {
  if (!usingS3()) {
    const { put: blobPut } = await blob();
    return blobPut(pathname, body, {
      access: "private",
      ...(contentType ? { contentType } : {}),
    });
  }
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: pathname,
      Body: body,
      ...(contentType ? { ContentType: contentType } : {}),
    })
  );
  return { pathname };
}

export async function del(pathname) {
  if (!usingS3()) {
    const { del: blobDel } = await blob();
    return blobDel(pathname);
  }
  await getClient().send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: pathname })
  );
}

// Throws if the object is absent — callers rely on that to detect a missing
// file, exactly as they did with the previous head().
export async function head(pathname) {
  if (!usingS3()) {
    const { head: blobHead } = await blob();
    return blobHead(pathname);
  }
  const res = await getClient().send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: pathname })
  );
  return {
    pathname,
    size: res.ContentLength,
    uploadedAt: res.LastModified,
    contentType: res.ContentType,
  };
}

// Returns a web stream plus the headers worth passing through to the browser,
// so a route can hand the body straight back without buffering the whole file.
export async function get(pathname) {
  if (!usingS3()) {
    const { get: blobGet } = await blob();
    return blobGet(pathname, { access: "private" });
  }
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: pathname })
  );
  return {
    stream: res.Body.transformToWebStream(),
    headers: {
      ...(res.ContentType ? { "content-type": res.ContentType } : {}),
      ...(res.ContentLength != null
        ? { "content-length": String(res.ContentLength) }
        : {}),
    },
  };
}

// A short-lived URL the browser can upload to directly. Only used when the
// storage service is reachable from the browser; see S3_PUBLIC_ENDPOINT.
export async function presignUpload(pathname, contentType, expiresIn = 600) {
  const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT;
  const signer = publicEndpoint
    ? new S3Client({
        endpoint: publicEndpoint,
        region: process.env.S3_REGION || "us-east-1",
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      })
    : getClient();

  return getSignedUrl(
    signer,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: pathname,
      ...(contentType ? { ContentType: contentType } : {}),
    }),
    { expiresIn }
  );
}
