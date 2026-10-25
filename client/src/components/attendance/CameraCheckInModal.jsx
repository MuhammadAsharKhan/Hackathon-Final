import { useEffect } from "react";
import { Camera, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useCameraCheckIn } from "@/hooks/useCameraCheckIn";

const RETRYABLE = [
  "model",
  "denied",
  "busy",
  "constraints",
  "location-unavailable",
  "location-timeout",
  "location-unknown",
  "hidden",
  "server",
];

const canOfferNormalCheckIn = (reason) =>
  reason.startsWith("location") || reason === "server" || reason === "duplicate";

const Preview = ({ videoRef, canvasRef, hidePreview }) => (
  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-ink">
    <div className="absolute inset-0 -scale-x-100">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        aria-label="Camera preview"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
    {hidePreview ? (
      <div className="absolute inset-0 flex items-center justify-center bg-ink">
        <Camera className="h-8 w-8 text-white/70" aria-hidden="true" />
      </div>
    ) : null}
  </div>
);

export default function CameraCheckInModal({ open, onClose, onChecked }) {
  const {
    phase,
    reason,
    message,
    statusText,
    location,
    locationNote,
    triesLeft,
    videoRef,
    canvasRef,
    confirm,
    retry,
    retryLocation,
    stop,
  } = useCameraCheckIn({ open, onChecked });

  useEffect(() => {
    if (phase !== "done") return;
    toast.success("Checked in");
    onClose?.();
  }, [phase, onClose]);

  const handleClose = () => {
    stop();
    onClose?.();
  };

  const busy = phase === "starting";
  const error = phase === "error";
  const retryable = error && RETRYABLE.includes(reason);
  const showPreview = !busy && !error && phase !== "done";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Camera check-in"
      description="Your face and your location are checked once, on this device."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={handleClose}>
            {phase === "done" ? "Close" : "Cancel"}
          </Button>
          {retryable ? (
            <Button className="w-full sm:w-auto" onClick={retry}>
              Try again
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={confirm}
              disabled={phase !== "confirmable"}
              loading={phase === "submitting"}
            >
              Confirm check-in
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <Preview videoRef={videoRef} canvasRef={canvasRef} hidePreview={!showPreview} />

        {busy ? (
          <p className="flex items-center gap-2 text-sm text-text-2" role="status">
            <Spinner />
            Starting the camera and the face model
          </p>
        ) : null}

        {showPreview ? (
          <p className="text-sm text-text-2" role="status" aria-live="polite">
            {statusText}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-status-rose" role="alert">
            {message}
          </p>
        ) : null}

        {!error && location ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Accuracy {location.accuracy} m
          </p>
        ) : null}

        {!error && !location && showPreview ? (
          <p className="text-xs text-muted" role="status">
            Reading your location
          </p>
        ) : null}

        {locationNote && phase === "locating" ? (
          <div className="rounded-control border border-line bg-status-amber-bg px-3 py-2">
            <p className="text-xs text-status-amber" role="status">
              {locationNote}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 px-0"
              onClick={retryLocation}
              disabled={triesLeft === 0}
            >
              Try again for a fresh location
            </Button>
            <p className="mt-1 text-xs text-muted">
              {triesLeft > 0
                ? `${triesLeft} tries left.`
                : "Move to an open area, or use the normal Check in button."}
            </p>
          </div>
        ) : null}

        {canOfferNormalCheckIn(reason) && error ? (
          <p className="text-xs text-muted">
            The normal Check in button works at any time.
          </p>
        ) : null}

        <p className="text-xs text-muted">
          Only the result of the check is saved. No photo is stored or sent.
        </p>
      </div>
    </Modal>
  );
}
