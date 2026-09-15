import { describe, expect, it } from "vitest";
import { decodeProfilePhoto } from "./routers/member";

describe("member profile photo validation", () => {
  it("accepts a JPEG byte signature within the member photo size limit", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(decodeProfilePhoto(jpeg.toString("base64"), "image/jpeg")).toEqual(jpeg);
  });

  it("rejects invalid base64 and mismatched image declarations", () => {
    expect(() => decodeProfilePhoto("not valid base64?", "image/jpeg")).toThrow("could not be read");
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => decodeProfilePhoto(png.toString("base64"), "image/jpeg")).toThrow("does not match");
  });

  it("rejects photos larger than 2 MB before any storage action", () => {
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 1);
    expect(() => decodeProfilePhoto(oversized.toString("base64"), "image/jpeg")).toThrow("up to 2 MB");
  });
});
