import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
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

/**
 * Deletes one entry after explicit confirmation. After a successful deletion
 * the trigger's row disappears, so focus goes to `onDeleted` instead of back
 * to the trigger.
 */
export function DeleteEntryDialog({
  entryId,
  expectedRevision,
  modelKey,
  onDeleted,
  title,
}: {
  readonly entryId: string;
  readonly expectedRevision: number;
  readonly modelKey: string;
  readonly onDeleted?: () => void;
  readonly title: string;
}) {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const deleted = useRef(false);
  const remove = useMutation({
    mutationFn: () => client.deleteEntry(entryId, expectedRevision),
    onSuccess: async () => {
      deleted.current = true;
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.modelEntries(modelKey) });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.models });
    },
  });
  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) remove.reset();
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button aria-label={`Delete ${title}`} size="icon-sm" variant="ghost">
          <Trash2 aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!deleted.current) return;
          event.preventDefault();
          onDeleted?.();
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete entry?</DialogTitle>
          <DialogDescription>
            {`“${title}” will be permanently deleted. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {remove.error === null ? undefined : (
          <ErrorState
            description={errorDescription(remove.error)}
            technicalDetails={technicalDetails(remove.error)}
          />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={remove.isPending} onClick={() => remove.mutate()} variant="destructive">
            {remove.isPending ? "Deleting…" : "Delete entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
