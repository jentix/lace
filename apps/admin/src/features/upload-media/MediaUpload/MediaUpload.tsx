import type { MediaMetadataDto } from "@lacecms/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { maxMediaBytes, mediaTypes } from "../../../entities/media/index.js";
import { useSessionRecovery } from "../../../entities/session/index.js";
import { adminQueryKeys, errorDescription, useAdminClient } from "../../../shared/api/index.js";

/** Validates and uploads one image, reporting pending, rejected, and accepted results. */
export function MediaUpload({
  onUploaded,
  selectable,
}: {
  readonly onUploaded: (item: MediaMetadataDto) => void;
  readonly selectable: boolean;
}) {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const uploadId = useId();
  const [uploaded, setUploaded] = useState<MediaMetadataDto | undefined>();
  const [uploadError, setUploadError] = useState<string | undefined>();
  const upload = useMutation({
    mutationFn: (file: File) => client.uploadMedia(file),
    onSuccess: async (item) => {
      setUploaded(item);
      onUploaded(item);
      setUploadError(undefined);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.media });
    },
  });
  useSessionRecovery(upload.error);
  return (
    <div className="grid gap-2">
      <label htmlFor={uploadId}>Upload image</label>
      <p>JPEG, PNG, WebP, or AVIF. Maximum 10 MiB.</p>
      <input
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-background file:px-2.5 file:py-1 file:font-medium file:text-foreground"
        disabled={upload.isPending}
        id={uploadId}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file === undefined) return;
          if (file.size > maxMediaBytes || (file.type !== "" && !mediaTypes.has(file.type))) {
            setUploadError("Choose a JPEG, PNG, WebP, or AVIF image no larger than 10 MiB.");
            return;
          }
          setUploadError(undefined);
          upload.mutate(file);
        }}
        type="file"
      />
      {upload.isPending ? <p role="status">Uploading image…</p> : undefined}
      {uploadError === undefined && upload.error === null ? undefined : (
        <p role="alert">{uploadError ?? errorDescription(upload.error)}</p>
      )}
      {uploaded === undefined ? undefined : (
        <p role="status">
          Uploaded {uploaded.filename}.{selectable ? " Select it to use it." : ""}
        </p>
      )}
    </div>
  );
}
