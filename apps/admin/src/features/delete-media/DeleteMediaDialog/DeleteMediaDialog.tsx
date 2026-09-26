import type { MediaMetadataDto } from "@lacecms/contracts";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { technicalDetails } from "../../../shared/api/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/Dialog/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { mediaDeletionDescription, useMediaDeletion } from "../useMediaDeletion.js";

/**
 * Requests deletion of one active media item after explicit confirmation.
 * The accepted item (now `deleting`) is reported through `onChanged`; a
 * refusal keeps the dialog open with an explanation.
 */
export function DeleteMediaDialog({
  item,
  onChanged,
}: {
  readonly item: MediaMetadataDto;
  readonly onChanged: (item: MediaMetadataDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const deletion = useMediaDeletion((changed) => {
    setOpen(false);
    onChanged(changed);
  });
  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) deletion.reset();
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Trash2 aria-hidden="true" />
          Delete media
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Delete ${item.filename}?`}</DialogTitle>
          <DialogDescription>
            The file is removed from storage in the background. It stays listed as pending deletion
            until removal completes, and a failed removal can be retried.
          </DialogDescription>
        </DialogHeader>
        {deletion.error === null ? undefined : (
          <ErrorState
            description={mediaDeletionDescription(deletion.error)}
            technicalDetails={technicalDetails(deletion.error)}
          />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={deletion.isPending}
            onClick={() => deletion.mutate({ id: item.id, retry: false })}
            variant="destructive"
          >
            {deletion.isPending ? "Deleting…" : "Delete media"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
