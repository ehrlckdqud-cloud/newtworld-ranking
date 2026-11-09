/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: GPL-3.0-only
 */
import xbrzWasm from "../../lib/main/xbrz.wasm.js";
/** Maximum width/height of source image. Maximum target image size is up to six times larger. */
const MAX_SOURCE_DIMENSION = 8192;
/**
 * Scaler instance for a specific source image size and scale factor.
 */
export class Scaler {
    #wasm;
    #source;
    #target;
    #sourceBytes;
    /** The source image width in pixels. */
    #sourceWidth;
    /** The source image height in pixels. */
    #sourceHeight;
    /** The target image width in pixels. */
    #targetWidth;
    /** The target image height in pixels. */
    #targetHeight;
    /** The scale factor (2, 3, 4, 5 or 6). */
    #factor;
    /**
     * Creates a new scaler instance for the given source image size and scale factor.
     *
     * @param sourceWidth  - The source image width in pixels (0-8192). Fractional parts are discarded.
     * @param sourceHeight - The source image height in pixels (0-8192). Fractional parts are discarded.
     * @param factor       - The scale factor. Must be 2, 3, 4, 5 or 6.
     * @param options      - Optional scaler configuration. `largeLut` defaults to `false`.
     * @throws {@link !RangeError} if width, height, scale factor or `largeLut` is invalid.
     */
    constructor(sourceWidth, sourceHeight, factor, { largeLut = false } = {}) {
        if (!(sourceWidth >= 0 && sourceWidth <= MAX_SOURCE_DIMENSION)) {
            throw new RangeError(`Source width must be 0-${MAX_SOURCE_DIMENSION} but is ${sourceWidth}`);
        }
        if (!(sourceHeight >= 0 && sourceHeight <= MAX_SOURCE_DIMENSION)) {
            throw new RangeError(`Source height must be 0-${MAX_SOURCE_DIMENSION} but is ${sourceHeight}`);
        }
        if (factor !== 2 && factor !== 3 && factor !== 4 && factor !== 5 && factor !== 6) {
            throw new RangeError(`Scale factor must be 2, 3, 4, 5 or 6 but is ${factor}`);
        }
        const intSourceWidth = this.#sourceWidth = sourceWidth | 0;
        const intSourceHeight = this.#sourceHeight = sourceHeight | 0;
        this.#factor = factor;
        const wasm = this.#wasm = new WebAssembly.Instance(xbrzWasm).exports;
        const sourceBytes = this.#sourceBytes = intSourceWidth * intSourceHeight * 4;
        const targetWidth = this.#targetWidth = intSourceWidth * factor;
        const targetHeight = this.#targetHeight = intSourceHeight * factor;
        wasm.init(intSourceWidth, intSourceHeight, factor, largeLut);
        this.#source = new Uint8ClampedArray(wasm.memory.buffer, wasm.getSourcePointer(), sourceBytes);
        this.#target = new Uint8ClampedArray(wasm.memory.buffer, wasm.getTargetPointer(), targetWidth * targetHeight * 4);
    }
    /** @returns The source image width in pixels. */
    get sourceWidth() {
        return this.#sourceWidth;
    }
    /** @returns The source image height in pixels. */
    get sourceHeight() {
        return this.#sourceHeight;
    }
    /** @returns The target image width in pixels. */
    get targetWidth() {
        return this.#targetWidth;
    }
    /** @returns The target image height in pixels. */
    get targetHeight() {
        return this.#targetHeight;
    }
    /** @returns The scale factor (2, 3, 4, 5 or 6). */
    get factor() {
        return this.#factor;
    }
    /**
     * Scales the given source image data and returns the target image data.
     *
     * @param source - The source image data. Size (width * height * 4) must match the image size for which the scaler was initialized.
     * @returns The target image data. The scaler always updates and returns the same array buffer, so when you do not immediately write
     *          the buffer to a file or canvas before scaling a different image with the same scaler you might want to copy the buffer.
     */
    scale(source) {
        if (source.byteLength !== this.#sourceBytes) {
            throw new RangeError("Source image size does not match scaler size");
        }
        this.#source.set(source);
        this.#wasm.scale();
        return this.#target;
    }
}
//# sourceMappingURL=Scaler.js.map