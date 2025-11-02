# Cloudflare Worker Asset Uploads

Cloudflare Workers can be integrated with Cloudflare R2 for storage of arbitrary files. This is done by exposing an `/api/assets` endpoint for uploading and reading from an R2 bucket.

This pattern is useful when:

- **User-generated content**: Storing files uploaded by users (profile pictures, documents, images, videos) in your Worker application without exposing R2 credentials to the client
- **Dynamic asset serving**: Serving static assets with proper MIME types and caching headers directly from your Worker, eliminating the need for a separate CDN configuration
- **Temporary file storage**: Storing files generated during Worker execution (exports, processed images, reports) that need to be accessible via URL
- **Browser-compatible uploads**: Accepting file uploads directly from browser forms or drag-and-drop interfaces without requiring a separate upload service
- **Content delivery**: Serving files with metadata-derived headers (`Content-Type`, `Content-Disposition`, `Cache-Control`) for proper browser handling and caching

---

## R2 binding

Add an R2 bucket binding named `ASSETS_BUCKET` to `wrangler.json`. Update the bucket name to match your environment before deploying.

## GET /api/assets/:key

- Path: `/api/assets/<object-key>`
- Method: `GET`
- Behavior: looks up `<object-key>` inside `env.ASSETS_BUCKET` and returns the stored bytes with metadata-derived headers (`Content-Type`, `Content-Disposition`, `Cache-Control`).
- Responses:
  - `200` – binary body for the object.
  - `404` – when the object does not exist or the key segment is empty.

## POST /api/assets

- Path: `/api/assets`
- Method: `POST`
- Body: raw binary payload from the client. The Worker reads the request body as an `ArrayBuffer` and stores it with a generated key (`uploads/<uuid>/filename.ext`).
- Headers: the request `Content-Type` header is forwarded to R2 so that downloads return the correct MIME type.
- Responses:
  - `201` – JSON body `{ key, url }` that points to the persisted asset.
  - `400` – JSON error when the request body is empty.

### Example upload

```ts
const file = await fileInput.files?.[0]?.arrayBuffer();
const res = await fetch("/api/assets", {
  method: "POST",
  headers: {
    "content-type": fileInput.files?.[0]?.type ?? "application/octet-stream",
  },
  body: file,
});
const { url } = await res.json();
image.src = url; // e.g. "/api/assets/uploads/5f61f6ef-.../filename.ext"
```

The GET endpoint handles browser-friendly streaming, so the returned URL can be used directly as an `<img src>` or `<video src>` value.
