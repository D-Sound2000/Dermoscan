export type ImageQualityResult = {
  passed: boolean;
  score: number;
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  issues: string[];
  guidance: string[];
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be read."));
    };
    image.src = url;
  });
}

export async function analyzeImageQuality(file: File): Promise<ImageQualityResult> {
  const image = await loadImage(file);
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image quality analysis is unavailable in this browser.");

  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const gray = new Float32Array(size * size);
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let glarePixels = 0;

  for (let pixel = 0, index = 0; pixel < pixels.length; pixel += 4, index += 1) {
    const red = pixels[pixel];
    const green = pixels[pixel + 1];
    const blue = pixels[pixel + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    gray[index] = luminance;
    luminanceSum += luminance;
    luminanceSquaredSum += luminance * luminance;
    if (red > 245 && green > 245 && blue > 245) glarePixels += 1;
  }

  const count = size * size;
  const brightness = luminanceSum / count;
  const variance = Math.max(0, luminanceSquaredSum / count - brightness * brightness);
  const contrast = Math.sqrt(variance);
  let laplacianSquaredSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = y * size + x;
      const laplacian = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - size] - gray[i + size];
      laplacianSquaredSum += laplacian * laplacian;
      laplacianCount += 1;
    }
  }
  const sharpness = laplacianSquaredSum / Math.max(1, laplacianCount);
  const glareFraction = glarePixels / count;
  const issues: string[] = [];
  const guidance: string[] = [];

  if (image.width < 480 || image.height < 480) {
    issues.push("Low resolution");
    guidance.push("Move closer and use a photo at least 480 x 480 pixels.");
  }
  if (brightness < 55) {
    issues.push("Too dark");
    guidance.push("Use bright, even lighting without casting a shadow over the lesion.");
  } else if (brightness > 220) {
    issues.push("Overexposed");
    guidance.push("Reduce direct light so skin texture and color remain visible.");
  }
  if (contrast < 18) {
    issues.push("Low contrast");
    guidance.push("Retake the image with the lesion centered and clearly visible.");
  }
  if (sharpness < 115) {
    issues.push("Possibly blurry");
    guidance.push("Hold the camera steady, tap to focus, and retake the photo.");
  }
  if (glareFraction > 0.08) {
    issues.push("Strong glare");
    guidance.push("Avoid flash or reposition the light to remove shiny reflections.");
  }

  const score = Math.max(0, 100 - issues.length * 22);
  return {
    passed: issues.length === 0,
    score,
    width: image.width,
    height: image.height,
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    sharpness: Math.round(sharpness),
    issues,
    guidance,
  };
}

export async function createPrivatePreview(file: File): Promise<string> {
  const image = await loadImage(file);
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image preview creation is unavailable.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}
