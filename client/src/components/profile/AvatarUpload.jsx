import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { uploadAvatar, deleteAvatar } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export default function AvatarUpload() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!preview) return;

    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const chooseFile = () => {
    setError("");
    inputRef.current?.click();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Image must be 2 MB or smaller.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");

    try {
      const data = await uploadAvatar(file);
      updateUser(data.user);
      setPreview("");
      toast.success("Photo updated");
    } catch (requestError) {
      setPreview("");
      setError(getErrorMessage(requestError));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError("");

    try {
      const data = await deleteAvatar();
      updateUser(data.user);
      setPreview("");
      toast.success("Photo removed");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemoving(false);
    }
  };

  const shownUser = preview ? { ...user, avatarUrl: preview } : user;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar user={shownUser} size="lg" />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={chooseFile}
            loading={uploading}
            disabled={removing}
          >
            Change photo
          </Button>
          {user?.avatarUrl ? (
            <Button
              variant="ghost"
              onClick={handleRemove}
              loading={removing}
              disabled={uploading}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
        aria-label="Profile photo"
      />

      <p className="text-xs text-muted-foreground">
        JPEG, PNG or WebP, up to 2 MB.
      </p>

      <FormError>{error}</FormError>
    </div>
  );
}
