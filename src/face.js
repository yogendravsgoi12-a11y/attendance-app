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

// Mobile camera photos are often huge (4000x3000+), which can hang or
// crash face detection on a phone's browser. Shrink the image onto a
// canvas first — this is invisible to the user and makes detection
// fast and reliable on both mobile and desktop.
const MAX_DIMENSION = 1600

function resizeForDetection(imageElement) {
  const { naturalWidth: width, naturalHeight: height } = imageElement
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(imageElement, 0, 0, canvas.width, canvas.height)

  return canvas
}

// For registration: expects exactly one face and returns its 128-number
// "descriptor" (a fingerprint we can compare against later).
export async function getSingleFaceDescriptor(imageElement) {
  const image = resizeForDetection(imageElement)

  const result = await faceapi
    .detectSingleFace(image, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor()

  return result ? Array.from(result.descriptor) : null
}

// For classroom photos: finds every face and returns a descriptor for each.
export async function getAllFaceDescriptors(imageElement) {
  const image = resizeForDetection(imageElement)

  const results = await faceapi
    .detectAllFaces(image, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors()

  return results.map((r) => Array.from(r.descriptor))
}

// How different two descriptors are. Smaller = more similar.
// Two photos of the same person usually land under ~0.5.
export function distance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0))
}