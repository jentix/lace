import type { ManagedUserDto } from "@lacecms/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSessionRecovery } from "../../../entities/session/index.js";
import {
  AdminClientError,
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { Badge } from "../../../shared/ui/Badge/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { EmptyState } from "../../../shared/ui/EmptyState/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import {
  actionsClass,
  controlClass,
  fieldClass,
  formClass,
  pageClass,
} from "../../../shared/ui/layout/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";
import { PageAccessDenied } from "../../../shared/ui/PageState/index.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/Table/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";

const usersRoute = getRouteApi("/_protected/users");

export function UsersPage() {
  const { permitted } = usersRoute.useRouteContext();
  return permitted ? <UsersManager /> : <PageAccessDenied />;
}

const roleOptions = ["admin", "editor", "viewer"] as const;

function UsersManager() {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("viewer");
  const [notice, setNotice] = useState<string>();
  const [roleReset, setRoleReset] = useState(0);
  const users = useQuery({ queryKey: adminQueryKeys.users, queryFn: client.listUsers });
  const creation = useMutation({
    mutationFn: () => client.createUser({ email, password, role }),
    onSuccess: async (created) => {
      setPassword("");
      setEmail("");
      setNotice(`Created ${created.email}.`);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users });
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      change,
    }: {
      id: string;
      change: { disabled?: boolean; role?: (typeof roleOptions)[number] };
    }) => client.updateUser(id, change),
    onSuccess: async (changed) => {
      setNotice(`Updated ${changed.email}.`);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users });
    },
    onError: () => setRoleReset((value) => value + 1),
  });
  useSessionRecovery(users.error ?? creation.error ?? update.error);
  return (
    <section className={pageClass}>
      <h1>Users</h1>
      <p>
        Manage access to this Lace site. The final active administrator cannot be disabled or
        demoted.
      </p>
      <form
        className={formClass}
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(undefined);
          creation.mutate();
        }}
      >
        <h2>Create user</h2>
        <TextField
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="new-password"
          label="Password"
          minLength={12}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <label className={fieldClass}>
          Role
          <select
            className={controlClass}
            onChange={(event) => setRole(event.target.value as (typeof roleOptions)[number])}
            value={role}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={creation.isPending} type="submit">
          {creation.isPending ? "Creating…" : "Create user"}
        </Button>
      </form>
      {creation.error === null ? undefined : (
        <ErrorState
          description={errorDescription(creation.error)}
          technicalDetails={technicalDetails(creation.error)}
        />
      )}
      {update.error === null ? undefined : (
        <ErrorState
          description={
            update.error instanceof AdminClientError && update.error.code === "LAST_ADMIN_PROTECTED"
              ? "The final active administrator cannot be disabled or demoted."
              : errorDescription(update.error)
          }
          technicalDetails={technicalDetails(update.error)}
        />
      )}
      {notice === undefined ? undefined : <p role="status">{notice}</p>}
      <h2>Accounts</h2>
      {users.isPending ? (
        <LoadingState label="Loading users" />
      ) : users.error !== null ? (
        <ErrorState
          description={errorDescription(users.error)}
          technicalDetails={technicalDetails(users.error)}
        />
      ) : users.data?.items.length === 0 ? (
        <EmptyState
          description="Create the first additional account above."
          title="No users found"
        />
      ) : (
        <Table aria-label="Users">
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data?.items.map((account) => (
              <UserRow
                account={account}
                key={account.id}
                onUpdate={(change) => {
                  setNotice(undefined);
                  update.mutate({ id: account.id, change });
                }}
                pending={update.isPending}
                roleReset={roleReset}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function UserRow({
  account,
  onUpdate,
  pending,
  roleReset,
}: {
  readonly account: ManagedUserDto;
  readonly onUpdate: (change: { disabled?: boolean; role?: (typeof roleOptions)[number] }) => void;
  readonly pending: boolean;
  readonly roleReset: number;
}) {
  const [selectedRole, setSelectedRole] = useState(account.role);
  useEffect(() => setSelectedRole(account.role), [account.role, roleReset]);
  return (
    <TableRow>
      <TableCell>{account.email}</TableCell>
      <TableCell>
        <label className={fieldClass}>
          Role for {account.email}
          <select
            className={controlClass}
            disabled={pending || account.disabled}
            onChange={(event) =>
              setSelectedRole(event.target.value as (typeof roleOptions)[number])
            }
            value={selectedRole}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </TableCell>
      <TableCell>
        <Badge variant={account.disabled ? "warning" : "success"}>
          {account.disabled ? "Disabled" : "Active"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className={actionsClass}>
          <Button
            disabled={pending || account.disabled || selectedRole === account.role}
            onClick={() => onUpdate({ role: selectedRole })}
            variant="outline"
          >
            Save role
          </Button>
          <Button
            disabled={pending || account.disabled}
            onClick={() => {
              if (window.confirm(`Disable ${account.email}?`)) onUpdate({ disabled: true });
            }}
            variant="ghost"
          >
            Disable
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
