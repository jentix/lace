import type { BuildTokenCreatedDto } from "@lacecms/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/Dialog/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";

type CopyState = "copied" | "failed" | "idle";

/**
 * Issues a read-only build token. After confirmation the dialog shows the
 * plaintext once; it lives only in this component's state and is dropped when
 * the dialog closes or unmounts, never in the query cache or the URL.
 */
export function CreateBuildTokenDialog() {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<BuildTokenCreatedDto>();
  const [copy, setCopy] = useState<CopyState>("idle");
  const create = useMutation({
    // The plaintext goes straight to component state and the mutation resolves
    // without data, so the mutation cache never holds it.
    mutationFn: async () => {
      setIssued(await client.createToken(name.trim()));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.tokens }),
  });
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setIssued(undefined);
      setCopy("idle");
      create.reset();
    }
  }
  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <KeyRound aria-hidden="true" />
          Create build token
        </Button>
      </DialogTrigger>
      <DialogContent
        onInteractOutside={(event) => {
          if (issued !== undefined) event.preventDefault();
        }}
      >
        {issued === undefined ? (
          <>
            <DialogHeader>
              <DialogTitle>Create build token</DialogTitle>
              <DialogDescription>
                Build tokens let the site read published content during a build. They cannot change
                content.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim().length > 0) create.mutate();
              }}
            >
              <TextField
                label="Token name"
                maxLength={120}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="For example, production site"
                required
                value={name}
              />
              {create.error === null ? undefined : (
                <ErrorState
                  description={errorDescription(create.error)}
                  technicalDetails={technicalDetails(create.error)}
                  title="Token not created"
                />
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button disabled={name.trim().length === 0 || create.isPending} type="submit">
                  {create.isPending ? "Creating…" : "Create build token"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Copy your build token</DialogTitle>
              <DialogDescription>
                {`This is the only time “${issued.name}” is shown. Store it as LACE_BUILD_TOKEN in the site's server-side configuration.`}
              </DialogDescription>
            </DialogHeader>
            <code
              className="block rounded-md border border-border bg-muted p-3 font-mono text-xs wrap-anywhere select-all"
              data-testid="issued-token-value"
            >
              {issued.token}
            </code>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(issued.token)
                    .then(() => setCopy("copied"))
                    .catch(() => setCopy("failed"));
                }}
                variant="outline"
              >
                {copy === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                Copy token
              </Button>
              <p aria-live="polite" className="m-0 text-xs text-muted-foreground" role="status">
                {copy === "copied"
                  ? "Copied to the clipboard."
                  : copy === "failed"
                    ? "Copy failed. Select the token text and copy it manually."
                    : ""}
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
