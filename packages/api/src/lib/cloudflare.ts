import { AwsClient } from "aws4fetch";
import { randomUUID } from "crypto";
import path from "path";

export async function createSignedUrl(
  filename: string,
  opts: {
    accessKeyId: string;
    secretAccessKey: string;
    bucketUrl: string;
    endpointUrl: string;
  }
) {
  const uuid = randomUUID();
  const publicUrl = path.join(opts.bucketUrl, uuid, filename);
  const urlToSign = path.join(opts.endpointUrl, uuid, filename);
  const url = new URL(urlToSign);

  const EXPIRES = 60 * 15; // 15 minutes
  url.searchParams.set("X-Amz-Expires", EXPIRES.toString());

  const aws = new AwsClient({
    accessKeyId: opts.accessKeyId,
    secretAccessKey: opts.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const signed = await aws.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });

  return { uploadUrl: signed.url, publicUrl };
}
