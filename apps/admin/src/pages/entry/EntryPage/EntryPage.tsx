import type { ContentEntryDto, ContentModelDto } from "@lacecms/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useBlocker } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ulid } from "ulid";
import {
  createDraftResolver,
  draftValues,
  FieldRenderer,
  FieldRendererProvider,
  localDraftJson,
  pointerToFormField,
  resolvedPublicPath,
  suggestSlug,
  type DraftEditorValues,
  type FieldRendererRegistry,
} from "../../../entities/content/index.js";
import { useSession, useSessionRecovery } from "../../../entities/session/index.js";
import {
  buildDispatchDescription,
  PublishEntryDialog,
} from "../../../features/publish-entry/index.js";
import {
  AdminClientError,
  adminQueryKeys,
  errorDescription,
  useAdminClient,
} from "../../../shared/api/index.js";
import { cn } from "../../../shared/lib/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { Input } from "../../../shared/ui/Input/index.js";
import {
  actionsClass,
  checkboxClass,
  fieldClass,
  fieldErrorClass,
  formClass,
  pageClass,
  pageHeadingClass,
  panelClass,
  panelErrorClass,
} from "../../../shared/ui/layout/index.js";
import { PageError, PageLoading, PagePlaceholder } from "../../../shared/ui/PageState/index.js";
import { BlockEditor } from "../../../widgets/block-editor/index.js";
import { MediaPicker } from "../../../widgets/media-library/index.js";

const entryRoute = getRouteApi("/_protected/content/$modelKey/$entryId");
const mediaRenderers: FieldRendererRegistry = { media: MediaPicker };

export function EntryPage() {
  const { entryId, modelKey } = entryRoute.useParams();
  const client = useAdminClient();
  const session = useSession();
  const queryClient = useQueryClient();
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  const entry = useQuery({
    queryFn: () => client.loadEntry(entryId),
    queryKey: adminQueryKeys.entry(entryId),
  });
  const [savedEntry, setSavedEntry] = useState<ContentEntryDto | undefined>(undefined);
  const [conflict, setConflict] = useState<"publish" | "save" | undefined>(undefined);
  const [copyError, setCopyError] = useState<string | undefined>(undefined);
  const [publishAttempt, setPublishAttempt] = useState<
    { readonly idempotencyKey: string; readonly revision: number } | undefined
  >(undefined);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | undefined>(undefined);
  const currentEntry = savedEntry ?? entry.data;
  const model = models.data?.items.find((item) => item.key === modelKey);
  const modelRef = useRef<ContentModelDto | undefined>(undefined);
  modelRef.current = model;
  const form = useForm<DraftEditorValues, unknown, DraftEditorValues>({
    defaultValues: { blocks: [], fields: {}, title: "" },
    ...(model === undefined ? {} : { resolver: createDraftResolver(model) }),
  });
  const loaded = useRef<string | undefined>(undefined);
  const [suggestingSlug, setSuggestingSlug] = useState(false);
  const suggestingSlugRef = useRef(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const titleValue = form.watch("title");
  const initial =
    model === undefined || currentEntry === undefined
      ? undefined
      : draftValues(model, currentEntry);
  useEffect(() => {
    if (initial === undefined || currentEntry === undefined) return;
    const key = `${currentEntry.id}:${currentEntry.draft.revision}`;
    if (loaded.current === key) return;
    suggestingSlugRef.current = false;
    form.reset(initial);
    loaded.current = key;
    setSuggestingSlug(false);
    setSlugManuallyEdited(false);
  }, [currentEntry, form, initial]);
  useEffect(() => {
    setSavedEntry(undefined);
    setConflict(undefined);
    setPublishAttempt(undefined);
    setPublishMessage(undefined);
  }, [entryId]);
  useEffect(() => {
    if (!suggestingSlugRef.current || slugManuallyEdited) return;
    const suggested = suggestSlug(titleValue);
    if (form.getValues("slug") !== suggested)
      form.setValue("slug", suggested, { shouldDirty: true });
  }, [form, slugManuallyEdited, suggestingSlug, titleValue]);
  const blocker = useBlocker({
    enableBeforeUnload: () => form.formState.isDirty,
    shouldBlockFn: () => form.formState.isDirty,
    withResolver: true,
  });
  const save = useMutation({
    mutationFn: (values: DraftEditorValues) => {
      if (currentEntry === undefined) throw new Error("The entry has not loaded.");
      return client.saveDraft(entryId, {
        blocks: values.blocks,
        expectedRevision: currentEntry.draft.revision,
        fields: values.fields,
        ...(modelRef.current?.kind === "collection" && values.slug !== undefined
          ? { slug: values.slug }
          : {}),
        title: values.title,
      });
    },
    onError: (error) => {
      if (!(error instanceof AdminClientError)) return;
      if (error.code === "CONTENT_REVISION_CONFLICT") {
        setConflict("save");
        return;
      }
      for (const issue of error.issues ?? []) {
        const name = pointerToFormField(issue.path, modelRef.current, form.getValues("blocks"));
        if (name !== undefined)
          form.setError(name as never, { message: issue.message, type: "server" });
      }
    },
    onSuccess: async (saved) => {
      const savedModel = modelRef.current;
      if (savedModel === undefined) return;
      queryClient.setQueryData(adminQueryKeys.entry(entryId), saved);
      setSavedEntry(saved);
      suggestingSlugRef.current = false;
      setSuggestingSlug(false);
      setSlugManuallyEdited(false);
      setConflict(undefined);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
    },
  });
  const publish = useMutation({
    mutationFn: (attempt: { readonly idempotencyKey: string; readonly revision: number }) =>
      client.publishEntry(entryId, {
        expectedRevision: attempt.revision,
        idempotencyKey: attempt.idempotencyKey,
      }),
    onError: (error) => {
      if (error instanceof AdminClientError && error.code === "CONTENT_REVISION_CONFLICT") {
        setConflict("publish");
        setPublishAttempt(undefined);
        return;
      }
      if (error instanceof AdminClientError && error.status !== undefined)
        setPublishAttempt(undefined);
    },
    onSuccess: async (result) => {
      const publishedModel = modelRef.current;
      if (publishedModel === undefined) return;
      const values = draftValues(publishedModel, result.entry);
      queryClient.setQueryData(adminQueryKeys.entry(entryId), result.entry);
      setSavedEntry(result.entry);
      loaded.current = `${result.entry.id}:${result.entry.draft.revision}`;
      form.reset(values);
      setConflict(undefined);
      setPublishAttempt(undefined);
      setPublishMessage(buildDispatchDescription(result.build.status));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
    },
  });
  const reloadServerDraft = useMutation({
    mutationFn: () => client.loadEntry(entryId),
    onSuccess: (reloaded) => {
      const reloadedModel = modelRef.current;
      if (reloadedModel === undefined) return;
      queryClient.setQueryData(adminQueryKeys.entry(entryId), reloaded);
      setSavedEntry(reloaded);
      loaded.current = `${reloaded.id}:${reloaded.draft.revision}`;
      form.reset(draftValues(reloadedModel, reloaded));
      setConflict(undefined);
      setPublishAttempt(undefined);
    },
  });
  useSessionRecovery(models.error ?? entry.error);
  if (models.isPending || entry.isPending) return <PageLoading label="Loading draft" />;
  if (models.error !== null) return <PageError error={models.error} />;
  if (entry.error !== null) return <PageError error={entry.error} />;
  if (model === undefined || currentEntry === undefined || currentEntry.model.key !== model.key)
    return (
      <PagePlaceholder
        description="This entry is not available for the requested model."
        title="Entry not found"
      />
    );

  const errors = form.formState.errors.fields as
    | Record<string, { readonly message?: string }>
    | undefined;
  const blockErrors = form.formState.errors.blocks as
    | Record<string, Record<string, unknown>>
    | undefined;
  const publicPath = resolvedPublicPath(model, currentEntry);
  const canPublish = session.role === "admin";
  const retryPublish = () => {
    if (publishAttempt !== undefined) publish.mutate(publishAttempt);
  };
  const copyLocalDraft = async () => {
    try {
      if (navigator.clipboard === undefined) throw new Error("Clipboard is unavailable.");
      await navigator.clipboard.writeText(localDraftJson(form.getValues()));
      setCopyError(undefined);
    } catch {
      setCopyError("Could not copy local JSON. Select and copy it manually from your browser.");
    }
  };
  return (
    <section className={pageClass} aria-labelledby="entry-title">
      <div className={pageHeadingClass}>
        <div>
          <h1 id="entry-title">Edit {model.label ?? model.key}</h1>
          <p aria-live="polite">
            {save.isPending
              ? "Saving…"
              : form.formState.isDirty
                ? "Unsaved changes"
                : `Saved revision ${currentEntry.draft.revision}`}
          </p>
        </div>
        <div className={actionsClass}>
          <Button
            disabled={save.isPending || !form.formState.isDirty}
            onClick={form.handleSubmit((values) => save.mutate(values))}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          {canPublish ? (
            <PublishEntryDialog
              disabled={publish.isPending || form.formState.isDirty}
              onConfirm={() => {
                const attempt = {
                  idempotencyKey: ulid(),
                  revision: currentEntry.draft.revision,
                };
                setPublishAttempt(attempt);
                setPublishDialogOpen(false);
                publish.mutate(attempt);
              }}
              onOpenChange={setPublishDialogOpen}
              open={publishDialogOpen}
              pending={publish.isPending}
            />
          ) : undefined}
        </div>
      </div>
      <section aria-label="Publication status" className={panelClass}>
        <h2>Publication</h2>
        <p>Draft revision {currentEntry.draft.revision}</p>
        <p>
          Last edited by {currentEntry.draft.updatedBy.id} at {currentEntry.draft.updatedAt}
        </p>
        <p>{currentEntry.published === undefined ? "Not published" : "Published"}</p>
        {publicPath === undefined ? undefined : <p>Public path: {publicPath}</p>}
        {publishMessage === undefined ? undefined : <p role="status">{publishMessage}</p>}
        {publish.error !== null && publishAttempt !== undefined ? (
          <div className={actionsClass}>
            <p role="alert">{errorDescription(publish.error)}</p>
            <Button disabled={publish.isPending} onClick={retryPublish} variant="outline">
              Retry publish
            </Button>
          </div>
        ) : undefined}
      </section>
      <FieldRendererProvider renderers={mediaRenderers}>
        <form className={formClass} onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <label className={fieldClass} htmlFor="system-title">
            <span>Title</span>
            <Input
              aria-describedby={
                form.formState.errors.title === undefined ? undefined : "system-title-error"
              }
              id="system-title"
              {...form.register("title")}
            />
            {form.formState.errors.title === undefined ? undefined : (
              <p className={fieldErrorClass} id="system-title-error" role="alert">
                {form.formState.errors.title.message}
              </p>
            )}
          </label>
          {model.kind === "collection" ? (
            <div className={fieldClass}>
              <label htmlFor="system-slug">Slug</label>
              <Input
                aria-describedby={
                  form.formState.errors.slug === undefined ? undefined : "system-slug-error"
                }
                id="system-slug"
                {...form.register("slug", {
                  onChange: () => {
                    if (suggestingSlug) setSlugManuallyEdited(true);
                  },
                })}
              />
              <label className={checkboxClass}>
                <input
                  checked={suggestingSlug}
                  className="size-4 accent-primary"
                  onChange={(event) => {
                    const enabled = event.currentTarget.checked;
                    suggestingSlugRef.current = enabled;
                    setSuggestingSlug(enabled);
                    setSlugManuallyEdited(false);
                    if (enabled)
                      form.setValue("slug", suggestSlug(form.getValues("title")), {
                        shouldDirty: true,
                      });
                  }}
                  type="checkbox"
                />
                Suggest from title
              </label>
              {form.formState.errors.slug === undefined ? undefined : (
                <p className={fieldErrorClass} id="system-slug-error" role="alert">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>
          ) : undefined}
          {Object.entries(model.fields).map(([key, definition]) => (
            <FieldRenderer
              control={form.control}
              definition={definition}
              error={errors?.[key]?.message}
              fieldKey={key}
              key={key}
              name={`fields.${key}`}
            />
          ))}
          <BlockEditor control={form.control} errors={blockErrors} model={model} />
          <Button disabled={save.isPending || !form.formState.isDirty} type="submit">
            {save.isPending ? "Saving…" : "Save draft"}
          </Button>
        </form>
      </FieldRendererProvider>
      {conflict === undefined ? (
        save.error === null ? undefined : (
          <PageError error={save.error} />
        )
      ) : (
        <section
          aria-labelledby="conflict-title"
          className={cn(panelClass, panelErrorClass)}
          role="alert"
        >
          <h2 id="conflict-title">Draft changed elsewhere</h2>
          <p>
            Your local {conflict} values are still available. Reloading is the only action that
            replaces them.
          </p>
          <div className={actionsClass}>
            <Button
              disabled={reloadServerDraft.isPending}
              onClick={() => reloadServerDraft.mutate()}
            >
              {reloadServerDraft.isPending ? "Reloading…" : "Reload server draft"}
            </Button>
            <Button onClick={() => void copyLocalDraft()} variant="outline">
              Copy my JSON
            </Button>
          </div>
          {copyError === undefined ? undefined : <p role="alert">{copyError}</p>}
          {reloadServerDraft.error === null ? undefined : (
            <p role="alert">{errorDescription(reloadServerDraft.error)}</p>
          )}
        </section>
      )}
      {blocker.status !== "blocked" ? undefined : (
        <div
          aria-labelledby="discard-title"
          className={cn(panelClass, panelErrorClass)}
          role="alertdialog"
        >
          <h2 id="discard-title">Discard unsaved changes?</h2>
          <p>Your draft has not been saved.</p>
          <div className={actionsClass}>
            <Button onClick={() => blocker.reset()}>Stay</Button>
            <Button onClick={() => blocker.proceed()} variant="outline">
              Leave without saving
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
