// Reads a user-selected image file and returns a compact base64 data URL for
// storage in the database (mirrors the avatar upload pattern). Small files are
// kept as-is; larger ones are downscaled to keep rows lean.
export async function fileToDataUrl(file: File, maxBytes = 512 * 1024): Promise<string> {
  const raw = await file.arrayBuffer();
  if (raw.byteLength > 4 * 1024 * 1024) throw new Error("Image must be under 4 MB");
  const mime =
    file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  if (raw.byteLength <= maxBytes) {
    let b64 = "";
    const bytes = new Uint8Array(raw);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:${mime};base64,${btoa(b64)}`;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Could not read image"));
      i.src = url;
    });
    const maxSide = 1200;
    const scale = Math.min(maxSide / img.width, maxSide / img.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL(mime, 0.8);
    if (dataUrl.length > maxBytes * 1.4) throw new Error("Image too large after resizing");
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Reads a user-selected video file into a base64 data URL for storage. No
// re-encoding (browsers can't transcode), so a size cap is enforced instead.
export async function videoToDataUrl(file: File, maxBytes = 20 * 1024 * 1024): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Please choose a video file (MP4, WebM, MOV).");
  if (file.size > maxBytes) throw new Error("Video must be under 20 MB — try a shorter clip.");
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read video"));
    reader.readAsDataURL(file);
  });
}