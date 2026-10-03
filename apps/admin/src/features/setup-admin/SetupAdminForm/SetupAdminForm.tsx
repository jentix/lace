import { setupAdminRequestSchema } from "@lacecms/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as v from "valibot";
import { readSetupState } from "../../../entities/setup/index.js";
import { AdminClientError, useAdminClient } from "../../../shared/api/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";
import { PasswordField } from "../../../shared/ui/PasswordField/index.js";

/** Credentials live only in the form/request, never query mutation variables or navigation. */
export function SetupAdminForm({ redirectTo }: { readonly redirectTo: string }) {
  const client = useAdminClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [invalid, setInvalid] = useState<readonly string[]>([]);
  const [reconcileFailed, setReconcileFailed] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (message !== undefined) alert.current?.focus();
  }, [message]);

  async function complete() {
    if (!mounted.current) return;
    setPassword("");
    setToken("");
    await navigate({ to: "/login", search: { redirect: redirectTo, setupComplete: true } });
  }

  async function reconcile() {
    try {
      const state = await readSetupState(client);
      if (!mounted.current) return;
      if (state.setupComplete) {
        await complete();
        return;
      }
      setReconcileFailed(false);
      setMessage(
        "Setup is still incomplete. Check your token or ask the operator to issue a new one if it expired. After an interruption, retry with the same token and email.",
      );
    } catch {
      if (!mounted.current) return;
      setReconcileFailed(true);
      setMessage("Could not check whether setup completed. Try checking again before submitting.");
    }
  }

  async function submit() {
    if (busy.current || reconcileFailed) return;
    const checked = v.safeParse(setupAdminRequestSchema, { email, password, token });
    if (!checked.success) {
      const fields = checked.issues.map((issue) => String(issue.path?.[0]?.key));
      setInvalid(fields);
      setMessage(
        "Check the email address, a password of 12–1024 characters, and the bootstrap token of 40–128 characters.",
      );
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage(undefined);
    setInvalid([]);
    try {
      await client.setupAdmin(checked.output);
      await complete();
    } catch (error) {
      if (!mounted.current) return;
      const status = error instanceof AdminClientError ? error.status : undefined;
      if (status === 404 || status === undefined) await reconcile();
      else
        setMessage(
          status === 429
            ? "Too many setup attempts. Wait for the request limit to reset before trying again."
            : "Could not create the administrator. Check your details and try again.",
        );
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset disabled={pending || reconcileFailed} className="grid min-w-0 gap-4">
        <TextField
          autoComplete="email"
          autoFocus
          label="Email"
          type="email"
          required
          maxLength={320}
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          aria-invalid={invalid.includes("email")}
          aria-describedby={invalid.includes("email") ? "setup-error" : undefined}
        />
        <PasswordField
          autoComplete="new-password"
          label="Password"
          description="Use 12–1024 characters."
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          aria-invalid={invalid.includes("password")}
          {...(invalid.includes("password") ? { "aria-describedby": "setup-error" } : {})}
        />
        <TextField
          autoComplete="off"
          label="Bootstrap token"
          type="password"
          required
          value={token}
          onChange={(event) => setToken(event.currentTarget.value)}
          aria-invalid={invalid.includes("token")}
          aria-describedby={invalid.includes("token") ? "setup-error" : "setup-token-help"}
        />
        <p id="setup-token-help" className="text-sm text-muted-foreground">
          Ask your installation operator for a token. In a generated project they run{" "}
          <code>pnpm auth:bootstrap</code> with its environment configured, or{" "}
          <code>lace auth bootstrap</code> against the intended local or remote database. The token
          expires after one hour.
        </p>
      </fieldset>
      {message === undefined ? undefined : (
        <div id="setup-error" ref={alert} tabIndex={-1}>
          <ErrorState
            title={reconcileFailed ? "Could not check setup" : "Setup needs attention"}
            description={message}
            onRetry={
              reconcileFailed
                ? () => {
                    if (busy.current) return;
                    busy.current = true;
                    setPending(true);
                    void reconcile().finally(() => {
                      busy.current = false;
                      if (mounted.current) setPending(false);
                    });
                  }
                : undefined
            }
            retrying={pending}
          />
        </div>
      )}
      <Button className="w-full" disabled={pending || reconcileFailed} size="lg" type="submit">
        {pending ? "Checking setup…" : "Create administrator"}
      </Button>
      <span className="sr-only" role="status">
        {pending ? "Checking setup…" : ""}
      </span>
    </form>
  );
}
