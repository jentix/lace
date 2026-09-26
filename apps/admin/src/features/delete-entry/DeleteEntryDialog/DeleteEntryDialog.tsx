import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/Dialog/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";

export function DeleteEntryDialog({
  entryId,
  expectedRevision,
  modelKey,
  title,
}: {
  readonly entryId: string;
  readonly expectedRevision: number;
  readonly modelKey: string;
  readonly title: string;
}) {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => client.deleteEntry(entryId, expectedRevision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.modelEntries(modelKey) });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.models });
      setOpen(false);
    },
  });
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="ghost">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete entry</DialogTitle>
          <DialogDescription>{`Delete “${title}”? This cannot be undone.`}</DialogDescription>
        </DialogHeader>
        <Button disabled={remove.isPending} onClick={() => remove.mutate()}>
          {remove.isPending ? "Deleting…" : "Confirm deletion"}
        </Button>
        {remove.error === null ? undefined : (
          <ErrorState
            description={errorDescription(remove.error)}
            technicalDetails={technicalDetails(remove.error)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
