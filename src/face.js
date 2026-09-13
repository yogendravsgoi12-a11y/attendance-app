import * as faceapi from 'face-api.js'

// Model files served from this project's own public/models folder.
// See the README for the one-time download command to populate it.
const MODEL_URL = '/models'

let modelsLoaded = false

export async function loadModels() {
  if (modelsLoaded) return
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  modelsLoaded = true
}

// Bigger inputSize and a lower scoreThreshold catch smaller/harder faces
// in group photos, at the cost of a bit more processing time.
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 608,
  scoreThreshold: 0.4,
})

// For registration: expects exactly one face and returns its 128-number
// "descriptor" (a fingerprint we can compare against later).
export async function getSingleFaceDescriptor(imageElement) {
  const result = await faceapi
    .detectSingleFace(imageElement, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor()

  return result ? Array.from(result.descriptor) : null
}

// For classroom photos: finds every face and returns a descriptor for each.
export async function getAllFaceDescriptors(imageElement) {
  const results = await faceapi
    .detectAllFaces(imageElement, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors()

  return results.map((r) => Array.from(r.descriptor))
}

// How different two descriptors are. Smaller = more similar.
// Two photos of the same person usually land under ~0.5.
export function distance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0))
}
