import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useSessionSource } from "../../entities/session/index.js";
import { useAdminClient } from "../../shared/api/index.js";

/** Ends the session, clears remote state, and returns to login. */
export function useSignOut() {
  const client = useAdminClient();
  const sessionSource = useSessionSource();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.signOut,
    onSuccess: async () => {
      sessionSource.invalidate();
      queryClient.clear();
      await navigate({ search: { redirect: "/content" }, to: "/login" });
    },
  });
}
