import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { uploadAvatar, deleteAvatar } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

const validateImage = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Choose a JPEG, PNG or WebP image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 2 MB or smaller.";
  }
  return "";
};

export default function AvatarUpload() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const mountedRef = useMountedRef();

  useEffect(() => {
    if (!previewUrl) return;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const openFilePicker = () => {
    setError("");
    inputRef.current?.click();
  };

  const handleFile = async (event) => {
    if (uploading || removing) return;

    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const fileError = validateImage(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    // Show the local file immediately while Cloudinary receives the upload.
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setError("");

    try {
      const profileData = await uploadAvatar(file);
      if (!mountedRef.current) return;
      updateUser(profileData.user);
      setPreviewUrl("");
      toast.success("Photo updated");
    } catch (failure) {
      if (!mountedRef.current) return;
      setPreviewUrl("");
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (uploading || removing) return;
    setRemoving(true);
    setError("");

    try {
      const profileData = await deleteAvatar();
      if (!mountedRef.current) return;
      updateUser(profileData.user);
      setPreviewUrl("");
      toast.success("Photo removed");
    } catch (failure) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setRemoving(false);
    }
  };

  const shownUser = previewUrl
    ? { ...user, avatarUrl: previewUrl }
    : user;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar user={shownUser} size="lg" />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={openFilePicker}
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
