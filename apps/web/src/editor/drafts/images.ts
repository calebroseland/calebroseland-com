import { ImageTooLargeError, resizeImage, UnsupportedImageError } from "../document/resize.ts";
import type { BufferAsset, BufferController } from "./buffer.ts";

export type AddedImage =
  | { ok: true; asset: BufferAsset }
  /** `message` explains a file the editor cannot take (wrong type, too large). */
  | { ok: false; reason: "rejected"; message: string }
  | { ok: false; reason: "failed"; error: unknown };

/** Resizes an image and adds it to the buffer, waiting for alt text before it can be saved. */
export async function addImage(controller: BufferController, file: File): Promise<AddedImage> {
  try {
    const img = await resizeImage(file);
    const asset: BufferAsset = {
      name: img.name,
      type: img.type,
      blob: img.blob,
      objectUrl: URL.createObjectURL(img.blob),
      alt: "",
      width: img.width,
      height: img.height,
    };
    controller.addAsset(asset);
    return { ok: true, asset };
  } catch (error) {
    if (error instanceof UnsupportedImageError || error instanceof ImageTooLargeError)
      return { ok: false, reason: "rejected", message: error.message };
    return { ok: false, reason: "failed", error };
  }
}
