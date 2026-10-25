import { useCallback, useEffect, useRef, useState } from "react";
import { checkIn } from "@/api/attendance.api";
import { getErrorMessage } from "@/lib/errors";
import {
  explainMediaError,
  hasMediaApi,
  isInsecureMediaContext,
  mediaErrorReason,
} from "@/lib/mediaErrors";

const MODEL_URL = "/models";
const CAMERA_CONSTRAINTS = {
  facingMode: "user",
  width: { ideal: 640 },
  height: { ideal: 480 },
};
const DETECTOR_OPTIONS = { inputSize: 224, scoreThreshold: 0.5 };
const DETECTION_INTERVAL_MS = 200;
const GOOD_FRAMES_NEEDED = 5;
const MIN_FACE_WIDTH_RATIO = 0.2;
const MAX_OFFSET_X_RATIO = 0.25;
const MAX_OFFSET_Y_RATIO = 0.3;
const MAX_ACCURACY_METERS = 100;
const MAX_LOCATION_TRIES = 3;
const BOX_COLOUR = "#22c55e";

// The detector is large, so it loads once per page and every later open reuses
// the same promise.
let detectorPromise = null;

const chooseBackend = async (tf) => {
  try {
    await tf.setBackend("webgl");
    await tf.ready();
    if (tf.getBackend() !== "webgl") await tf.setBackend("cpu");
  } catch {
    await tf.setBackend("cpu");
  }
  await tf.ready();
};

const loadDetectorOnce = async () => {
  const faceapi = await import("@vladmandic/face-api");
  await chooseBackend(faceapi.tf);
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  return faceapi;
};

const loadDetector = () => {
  if (!detectorPromise) {
    detectorPromise = loadDetectorOnce().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }

  return detectorPromise;
};

// Development only: a test page can report a face count without a real face.
// The whole branch is removed from the production bundle.
const testHook = () => {
  if (!import.meta.env.DEV) return null;
  if (typeof window === "undefined") return null;
  const hook = window.__faceTest;
  if (!hook || typeof hook.faces !== "number") return null;
  return hook.faces;
};

const fakeDetections = (count, video) => {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  const box = {
    x: width * 0.3,
    y: height * 0.25,
    width: width * 0.4,
    height: height * 0.5,
  };

  return Array.from({ length: Math.max(0, count) }, () => ({ box }));
};

const judgeFrame = (detections, video) => {
  const width = video.videoWidth || 0;
  const height = video.videoHeight || 0;

  if (detections.length === 0) return { good: false, text: "No face in view." };
  if (detections.length > 1) {
    return { good: false, text: "More than one face. Only one person can check in." };
  }

  const box = detections[0].box ?? detections[0];
  if (box.width < width * MIN_FACE_WIDTH_RATIO) {
    return { good: false, text: "Move closer to the camera." };
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const offCentre =
    Math.abs(centerX - width / 2) > width * MAX_OFFSET_X_RATIO ||
    Math.abs(centerY - height / 2) > height * MAX_OFFSET_Y_RATIO;

  if (offCentre) return { good: false, text: "Move your face to the middle of the frame." };

  return { good: true, text: "Face detected. Hold still." };
};

const locationDeniedText =
  "Location is blocked for this site, so camera check-in cannot work. Allow location from the browser address bar, or use the normal Check in button instead.";

export const useCameraCheckIn = ({ open, onChecked }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const runningRef = useRef(false);
  const lastRunRef = useRef(0);
  const goodFramesRef = useRef(0);
  const stoppedRef = useRef(true);
  const fixedRef = useRef(null);
  const submittingRef = useRef(false);
  const phaseRef = useRef("idle");

  const [phase, setPhase] = useState("idle");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [statusText, setStatusText] = useState("Starting the camera");
  const [location, setLocation] = useState(null);
  const [locationNote, setLocationNote] = useState("");
  const [tries, setTries] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const goToPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopLoop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    runningRef.current = false;
  }, []);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    stopLoop();
    stopStream();
  }, [stopLoop, stopStream]);

  useEffect(() => () => stopAll(), [stopAll]);

  const settlePhase = useCallback(() => {
    if (["starting", "submitting", "done", "error", "idle"].includes(phaseRef.current)) {
      return;
    }

    const steady = goodFramesRef.current >= GOOD_FRAMES_NEEDED;
    const fixed = fixedRef.current;
    const located = Boolean(fixed) && fixed.accuracy <= MAX_ACCURACY_METERS;
    const next = steady ? (located ? "confirmable" : "locating") : "detecting";

    if (phaseRef.current !== next) goToPhase(next);
  }, [goToPhase]);

  const fail = useCallback(
    (nextReason, nextMessage) => {
      stopAll();
      setReason(nextReason);
      setMessage(nextMessage);
      setStatusText("");
      goToPhase("error");
    },
    [goToPhase, stopAll]
  );

  const readFix = useCallback(
    (position) => {
      const fix = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
      };

      fixedRef.current = fix;
      setLocation(fix);
      setLocationNote(
        fix.accuracy > MAX_ACCURACY_METERS
          ? `Location accuracy is ${fix.accuracy} m. Camera check-in needs 100 m or better.`
          : ""
      );
      settlePhase();
    },
    [settlePhase]
  );

  const handleLocationFailure = useCallback(
    (error) => {
      if (stoppedRef.current) return;

      if (error?.code === 1) {
        fail("location-denied", locationDeniedText);
        return;
      }
      if (error?.code === 2) {
        fail(
          "location-unavailable",
          "Your location is not available right now. Try again, or use the normal Check in button."
        );
        return;
      }
      if (error?.code === 3) {
        fail(
          "location-timeout",
          "Reading the location took too long. Try again, or use the normal Check in button."
        );
        return;
      }

      fail(
        "location-unknown",
        "The location could not be read. Try again, or use the normal Check in button."
      );
    },
    [fail]
  );

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fail(
        "location-unsupported",
        "This browser cannot read a location, so camera check-in cannot work. Use the normal Check in button instead."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(readFix, handleLocationFailure, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [fail, handleLocationFailure, readFix]);

  const retryLocation = useCallback(() => {
    if (tries >= MAX_LOCATION_TRIES - 1) return;
    setTries((current) => current + 1);
    setLocationNote("");
    requestLocation();
  }, [requestLocation, tries]);

  const drawBoxes = useCallback((detections) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 3;
    context.strokeStyle = BOX_COLOUR;

    for (const detection of detections) {
      const box = detection.box ?? detection;
      context.strokeRect(box.x, box.y, box.width, box.height);
    }
  }, []);

  const readDetections = useCallback(
    async (faceapi, video) => {
      const fake = testHook();
      if (fake !== null) return fakeDetections(fake, video);

      const options = new faceapi.TinyFaceDetectorOptions(DETECTOR_OPTIONS);
      return faceapi.detectAllFaces(video, options);
    },
    []
  );

  useEffect(() => {
    if (!open) {
      goToPhase("idle");
      return undefined;
    }

    let cancelled = false;
    const isCancelled = () => cancelled || stoppedRef.current;

    stoppedRef.current = false;
    goodFramesRef.current = 0;
    fixedRef.current = null;
    submittingRef.current = false;
    setReason("");
    setMessage("");
    setLocation(null);
    setLocationNote("");
    setStatusText("Starting the camera");
    goToPhase("starting");

    const startLoop = (faceapi) => {
      const tick = () => {
        if (isCancelled()) return;
        frameRef.current = requestAnimationFrame(tick);

        if (runningRef.current) return;
        if (performance.now() - lastRunRef.current < DETECTION_INTERVAL_MS) return;
        lastRunRef.current = performance.now();
        runningRef.current = true;

        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          runningRef.current = false;
          return;
        }

        readDetections(faceapi, video)
          .then((detections) => {
            if (isCancelled()) return;

            drawBoxes(detections);
            const verdict = judgeFrame(detections, video);
            setStatusText(verdict.text);
            goodFramesRef.current = verdict.good ? goodFramesRef.current + 1 : 0;
            settlePhase();
          })
          .catch(() => {})
          .finally(() => {
            runningRef.current = false;
          });
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    const openCamera = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: CAMERA_CONSTRAINTS,
          audio: false,
        });
      } catch (error) {
        if (error?.name !== "OverconstrainedError") throw error;
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    };

    const start = async () => {
      if (isInsecureMediaContext()) {
        fail("insecure", explainMediaError(null, "camera"));
        return;
      }
      if (!hasMediaApi("camera")) {
        fail(mediaErrorReason(null, "camera"), explainMediaError(null, "camera"));
        return;
      }

      requestLocation();

      const [model, media] = await Promise.allSettled([loadDetector(), openCamera()]);
      if (isCancelled()) {
        if (media.status === "fulfilled") {
          media.value.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      if (model.status === "rejected") {
        fail(
          "model",
          "The face model did not load. Check the connection and try again, or use the normal Check in button."
        );
        return;
      }
      if (media.status === "rejected") {
        fail(mediaErrorReason(media.reason, "camera"), explainMediaError(media.reason, "camera"));
        return;
      }

      const stream = media.value;
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play?.().catch(() => {});
      }

      goToPhase("detecting");
      setStatusText("Looking for your face");
      startLoop(model.value);
    };

    start();

    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      fail("hidden", "The camera stopped because the tab was hidden. Try again.");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopAll();
    };
  }, [
    open,
    attempt,
    drawBoxes,
    fail,
    goToPhase,
    readDetections,
    requestLocation,
    settlePhase,
    stopAll,
  ]);

  const confirm = useCallback(async () => {
    const fix = fixedRef.current;
    if (submittingRef.current) return;
    if (phaseRef.current !== "confirmable" || !fix) return;

    submittingRef.current = true;
    goToPhase("submitting");
    setMessage("");

    try {
      await checkIn({
        source: "camera",
        faceCount: 1,
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
      });
      stopAll();
      setStatusText("Checked in.");
      goToPhase("done");
      onChecked?.();
    } catch (error) {
      const status = error?.response?.status;
      stopAll();
      setReason(status === 409 ? "duplicate" : "server");
      setMessage(getErrorMessage(error));
      goToPhase("error");
      if (status === 409) onChecked?.();
    } finally {
      submittingRef.current = false;
    }
  }, [goToPhase, onChecked, stopAll]);

  const retry = useCallback(() => {
    setTries(0);
    setAttempt((current) => current + 1);
  }, []);

  return {
    phase,
    reason,
    message,
    statusText,
    location,
    locationNote,
    tries,
    triesLeft: Math.max(0, MAX_LOCATION_TRIES - 1 - tries),
    videoRef,
    canvasRef,
    confirm,
    retry,
    retryLocation,
    stop: stopAll,
  };
};

export default useCameraCheckIn;
