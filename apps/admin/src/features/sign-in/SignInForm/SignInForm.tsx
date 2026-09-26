import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSessionSource } from "../../../entities/session/index.js";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { formClass } from "../../../shared/ui/layout/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";

/** Signs in with email and password, then continues to the requested local route. */
export function SignInForm({ redirectTo }: { readonly redirectTo: string }) {
  const client = useAdminClient();
  const sessionSource = useSessionSource();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useMutation({
    mutationFn: () => client.signIn(email, password),
    onSuccess: async () => {
      sessionSource.invalidate();
      await sessionSource.get();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.session });
      await navigate({ to: redirectTo });
    },
  });
  return (
    <>
      <form
        className={formClass}
        onSubmit={(event) => {
          event.preventDefault();
          signIn.mutate();
        }}
      >
        <TextField
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="current-password"
          label="Password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          type="password"
          value={password}
        />
        <Button disabled={signIn.isPending} type="submit">
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {signIn.error === null ? undefined : (
        <ErrorState
          description={errorDescription(signIn.error)}
          technicalDetails={technicalDetails(signIn.error)}
        />
      )}
    </>
  );
}
