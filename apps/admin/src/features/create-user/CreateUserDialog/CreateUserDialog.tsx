import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { RoleSelect, type AdminRole } from "../../../entities/session/index.js";
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
import { PasswordField } from "../../../shared/ui/PasswordField/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";
import { toast } from "../../../shared/ui/Toaster/index.js";

/** The API's password rule, stated beside the field. */
const minimumPasswordLength = 12;

/** Creates an account with an email, an initial password, and a role. */
export function CreateUserDialog() {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("viewer");
  const create = useMutation({
    mutationFn: () => client.createUser({ email: email.trim(), password, role }),
    onSuccess: async (created) => {
      changeOpen(false);
      toast.success(`Created ${created.email}.`);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users });
    },
  });
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail("");
      setPassword("");
      setRole("viewer");
      create.reset();
    }
  }
  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden="true" />
          Create user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Share the email and initial password with the new user so they can sign in.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <TextField
            autoComplete="off"
            label="Email"
            maxLength={320}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
          <PasswordField
            autoComplete="new-password"
            description={`At least ${minimumPasswordLength} characters.`}
            label="Password"
            minLength={minimumPasswordLength}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            value={password}
          />
          <RoleSelect onValueChange={setRole} value={role} />
          {create.error === null ? undefined : (
            <ErrorState
              description={errorDescription(create.error)}
              technicalDetails={technicalDetails(create.error)}
              title="Could not create user"
            />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={create.isPending} type="submit">
              {create.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
