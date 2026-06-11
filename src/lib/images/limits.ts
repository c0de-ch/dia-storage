/**
 * Maximum number of pixels Sharp will decode from an input image. Guards
 * against decompression bombs: a tiny, highly compressed file that expands to
 * billions of pixels and OOM-kills the process. 50 MP comfortably covers a
 * 22 MP scanner original while rejecting absurd inputs.
 *
 * Pass as `sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })` everywhere a
 * Sharp pipeline is constructed from untrusted bytes.
 */
export const MAX_INPUT_PIXELS = 50_000_000;
