import { LOGO_DATA_URL_MAX } from "@starter/shared/validators/fnb/settings";

// Logo upload: the file is validated, cropped to a square, downscaled, and
// saved inline in settings.logoUrl as a small data URL (the API caps its
// size). Replace with a stored file URL once uploads exist.

const MAX_BYTES = 1024 * 1024;
const SIZE = 192;

export class LogoError extends Error {}

export async function logoDataUrl(file: File): Promise<string> {
  if (file.type !== "image/png" && file.type !== "image/jpeg")
    throw new LogoError("Pilih file PNG atau JPG.");
  if (file.size > MAX_BYTES)
    throw new LogoError(
      "Ukuran file maksimal 1 MB. Pilih gambar yang lebih kecil.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new LogoError("Gambar tidak bisa dibaca. Coba file lain.");
  }
  // Centre-crop to a square, like the square logo tile.
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoError("Gambar tidak bisa diproses. Coba file lain.");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    out,
    out,
  );
  bitmap.close();
  // Smallest first; browsers that cannot encode WebP fall back to PNG.
  for (const [type, quality] of [
    ["image/webp", 0.9],
    ["image/png", undefined],
    ["image/jpeg", 0.85],
  ] as const) {
    const url = canvas.toDataURL(type, quality);
    if (url.startsWith(`data:${type};`) && url.length <= LOGO_DATA_URL_MAX)
      return url;
  }
  throw new LogoError("Gambar terlalu rumit. Coba logo yang lebih sederhana.");
}
