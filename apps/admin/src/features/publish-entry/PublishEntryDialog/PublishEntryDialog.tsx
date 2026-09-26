import { Button } from "../../../shared/ui/Button/index.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/Dialog/index.js";
import { actionsClass } from "../../../shared/ui/layout/index.js";

/** Asks the administrator to confirm publishing the current validated draft. */
export function PublishEntryDialog({
  disabled,
  onConfirm,
  onOpenChange,
  open,
  pending,
}: {
  readonly disabled: boolean;
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly pending: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Publish</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish this entry?</DialogTitle>
          <DialogDescription>
            Publishing makes the current validated draft public. A later draft save will not change
            it.
          </DialogDescription>
        </DialogHeader>
        <div className={actionsClass}>
          <Button disabled={pending} onClick={onConfirm}>
            {pending ? "Publishing…" : "Confirm publication"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
