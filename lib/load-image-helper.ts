/**
 * Helper function to load an image from a URL and return it as a base64 string
 * that can be used with jsPDF's addImage method
 *
 * @param url - The URL of the image to load
 * @param maxWidth - Maximum width for the image (optional, for optimization)
 * @param maxHeight - Maximum height for the image (optional, for optimization)
 * @param quality - JPEG quality (0.0 to 1.0, default 0.85)
 */
export async function loadImage(url: string, maxWidth?: number, maxHeight?: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")

      let width = img.width
      let height = img.height

      // Resize if max dimensions are specified
      if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get canvas context"))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, width, height)

      try {
        const needsTransparency =
          url.toLowerCase().endsWith(".svg") ||
          url.toLowerCase().includes("meta-logo") ||
          url.toLowerCase().includes("linkedin-logo")
        const isPNG = needsTransparency || url.toLowerCase().endsWith(".png") || url.toLowerCase().includes(".png?")
        const dataUrl = isPNG ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality)
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error(`Failed to load image from ${url}`))
    }

    img.src = url
  })
}
