import client, { API_BASE_URL } from './api';

const API_ORIGIN = new URL(API_BASE_URL).origin;
const MAX_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

/** Uploaded images are stored as "/api/uploads/<id>"; turn that into a full URL for <img>. */
export function mediaUrl(src) {
  if (!src) return src;
  return src.startsWith('/api/uploads/') ? API_ORIGIN + src : src;
}

/** Throws a user-friendly error if `file` is not an image we accept. */
export function checkImageFile(file) {
  if (!file || !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, GIF and WebP images are supported.');
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks the image so its longest side is at most `maxSize` px and re-encodes it as WebP
 * (JPEG if the browser can't), which also strips camera metadata such as GPS location.
 * GIFs are sent as-is to keep their animation.
 */
export async function prepareImage(file, maxSize = 1600) {
  checkImageFile(file);
  if (file.type === 'image/gif') {
    if (file.size > MAX_BYTES) throw new Error('GIFs must be 5 MB or smaller.');
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  let blob = await canvasToBlob(canvas, 'image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('Could not process this image.');
  if (blob.size > MAX_BYTES) throw new Error('This image is too large even after resizing.');

  return new File([blob], blob.type === 'image/webp' ? 'image.webp' : 'image.jpg', { type: blob.type });
}

/** Resize + upload. Resolves to the stored image URL ("/api/uploads/<id>"). */
export async function uploadImage(file, maxSize = 1600) {
  const prepared = await prepareImage(file, maxSize);
  const form = new FormData();
  form.append('file', prepared);
  const { data } = await client.post('/uploads', form);
  return data.url;
}

// ---------------------------------------------------------------- video + progress

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const VIDEO_ACCEPT_ATTR = ACCEPTED_VIDEO_TYPES.join(',');
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Throws a user-friendly error if `file` is not a video we accept (checked again on the server). */
export function checkVideoFile(file) {
  if (!file || !ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('Only MP4 and WebM videos are supported.');
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Videos must be 50 MB or smaller (this one is ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }
}

/**
 * Upload an image (resized first) or a video, reporting progress (0–100) and supporting
 * cancellation through an AbortSignal. Resolves to the stored URL.
 */
export async function uploadMedia(file, { kind = 'image', maxSize = 1600, onProgress, signal } = {}) {
  const prepared = kind === 'video' ? (checkVideoFile(file), file) : await prepareImage(file, maxSize);
  const form = new FormData();
  form.append('file', prepared);
  const { data } = await client.post('/uploads', form, {
    signal,
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
  return data.url;
}
