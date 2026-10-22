import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { Button } from "@/components/ui/button";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { portalDb } from "@/lib/portal-db";
import { MODULE_KIND_LABEL, type ModuleKind } from "@/lib/partner-portal";
import { useTrainingCatalog } from "./portal.training.index";

export const Route = createFileRoute("/_portal/portal/training/$trainingId")({
  head: () => ({
    meta: [
      { title: "Course — Magenta Portal" },
      {
        name: "description",
        content: "Work through this Magenta partner course module by module and track completion.",
      },
      { property: "og:title", content: "Course — Magenta Portal" },
      {
        property: "og:description",
        content: "Modules and progress for this Magenta partner course.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingDetail,
});

function TrainingDetail() {
  const { trainingId } = useParams({ from: "/_portal/portal/training/$trainingId" });
  const { data: identity } = usePortalIdentity();
  const { data, isLoading } = useTrainingCatalog();
  const queryClient = useQueryClient();

  const course = (data?.courses ?? []).find((c) => c.id === trainingId);
  const modules = (data?.modules ?? []).filter((m) => m.training_id === trainingId);

  const toggle = useMutation({
    mutationFn: async ({ moduleId, done }: { moduleId: string; done: boolean }) => {
      const member = identity?.member;
      if (!member) throw new Error("Your partner membership could not be resolved.");
      if (done) {
        const { error } = await portalDb
          .from("partner_training_progress")
          .delete()
          .eq("module_id", moduleId)
          .eq("member_id", member.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await portalDb.from("partner_training_progress").insert({
          module_id: moduleId,
          member_id: member.id,
          organization_id: member.organization_id,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-training"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PartnerShell>
      <PortalPageHeader
        title={course?.title ?? (isLoading ? "Loading…" : "Course Not Found")}
        subtitle={course?.description ?? undefined}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/portal/training">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All Courses
            </Link>
          </Button>
        }
      />

      {!course && !isLoading ? (
        <div className="card-elevated p-10 text-center">
          <p className="text-sm text-muted-foreground">
            That course is no longer published.
          </p>
        </div>
      ) : (
        <ol className="grid gap-3">
          {modules.map((m, index) => {
            const done = Boolean(data?.completed.has(m.id));
            return (
              <li key={m.id} className="card-elevated flex flex-wrap items-center gap-4 p-5">
                <span className="font-display text-2xl text-muted-foreground">{index + 1}</span>
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {MODULE_KIND_LABEL[m.kind as ModuleKind]}
                    {m.duration_minutes ? ` · ${m.duration_minutes} min` : ""}
                  </p>
                  {m.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                  ) : null}
                </div>
                {m.content_url ? (
                  <Button asChild variant="secondary" size="sm">
                    <a href={m.content_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open
                    </a>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={done ? "outline" : "default"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ moduleId: m.id, done })}
                >
                  {done ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" /> Completed
                    </>
                  ) : (
                    "Mark Complete"
                  )}
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </PartnerShell>
  );
}
