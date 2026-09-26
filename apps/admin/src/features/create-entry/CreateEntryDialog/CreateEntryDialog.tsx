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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/Dialog/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { formClass } from "../../../shared/ui/layout/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";

export function CreateEntryDialog({ modelKey }: { readonly modelKey: string }) {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = useMutation({
    mutationFn: () => client.createEntry(modelKey, title),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.models });
      setOpen(false);
      setTitle("");
    },
  });
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Create entry</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Create entry</DialogTitle>
        </DialogHeader>
        <form
          className={formClass}
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <TextField
            label="Title"
            onChange={(event) => setTitle(event.currentTarget.value)}
            required
            value={title}
          />
          <Button disabled={create.isPending} type="submit">
            {create.isPending ? "Creating…" : "Create entry"}
          </Button>
        </form>
        {create.error === null ? undefined : (
          <ErrorState
            description={errorDescription(create.error)}
            technicalDetails={technicalDetails(create.error)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
