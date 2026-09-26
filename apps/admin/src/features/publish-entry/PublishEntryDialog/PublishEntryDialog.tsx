import { Send } from "lucide-react";
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

/** Asks the administrator to confirm publishing the current validated draft. */
export function PublishEntryDialog({
  disabled,
  onConfirm,
  onOpenChange,
  open,
  pending,
  publicPath,
  revision,
}: {
  readonly disabled: boolean;
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly pending: boolean;
  readonly publicPath?: string | undefined;
  readonly revision?: number | undefined;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Send aria-hidden="true" />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish this entry?</DialogTitle>
          <DialogDescription>
            {revision === undefined ? "The current draft" : `Draft revision ${revision}`} becomes
            the public version
            {publicPath === undefined ? "" : ` at ${publicPath}`}. A later draft save will not
            change it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={pending} onClick={onConfirm}>
            {pending ? "Publishing…" : "Confirm publication"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
