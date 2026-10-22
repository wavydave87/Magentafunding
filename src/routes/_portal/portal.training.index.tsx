import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ToneBadge } from "@/components/partner/tone-badge";
import { portalDb } from "@/lib/portal-db";
import { usePortalIdentity } from "@/hooks/use-portal-identity";

export const Route = createFileRoute("/_portal/portal/training/")({
  head: () => ({
    meta: [
      { title: "Training — Magenta Portal" },
      {
        name: "description",
        content:
          "Short Magenta courses on submitting stronger files, underwriting expectations and partner best practice.",
      },
      { property: "og:title", content: "Training — Magenta Portal" },
      {
        property: "og:description",
        content: "Courses and modules to help your team submit stronger files.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingList,
});

export function useTrainingCatalog() {
  const { data: identity } = usePortalIdentity();
  const memberId = identity?.member?.id ?? null;

  return useQuery({
    queryKey: ["partner-training", memberId],
    queryFn: async () => {
      const [courses, modules, progress] = await Promise.all([
        portalDb
          .from("partner_trainings")
          .select("id, title, description, category, published, sort_order")
          .order("sort_order"),
        portalDb
          .from("partner_training_modules")
          .select("id, training_id, title, description, kind, content_url, duration_minutes, sort_order")
          .order("sort_order"),
        memberId
          ? portalDb
              .from("partner_training_progress")
              .select("module_id, completed_at")
              .eq("member_id", memberId)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (courses.error) throw new Error(courses.error.message);
      if (modules.error) throw new Error(modules.error.message);
      return {
        courses: (courses.data ?? []).filter((c) => c.published),
        modules: modules.data ?? [],
        completed: new Set((progress.data ?? []).map((p) => p.module_id)),
      };
    },
  });
}

function TrainingList() {
  const { data, isLoading } = useTrainingCatalog();
  const courses = data?.courses ?? [];

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Training"
        subtitle="Short courses that help your team submit files Magenta can fund faster."
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-elevated h-32 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Magenta hasn't published any courses yet. Check back soon.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => {
            const mods = (data?.modules ?? []).filter((m) => m.training_id === course.id);
            const done = mods.filter((m) => data?.completed.has(m.id)).length;
            const pct = mods.length === 0 ? 0 : Math.round((done / mods.length) * 100);
            return (
              <li key={course.id} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {course.category}
                    </p>
                    <Link
                      to="/portal/training/$trainingId"
                      params={{ trainingId: course.id }}
                      className="focus-ring font-display text-lg underline-offset-2 hover:underline"
                    >
                      {course.title}
                    </Link>
                  </div>
                  <ToneBadge
                    label={pct === 100 ? "Complete" : pct === 0 ? "Not Started" : `${pct}%`}
                    tone={pct === 100 ? "success" : pct === 0 ? "muted" : "primary"}
                    icon={GraduationCap}
                  />
                </div>
                {course.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
                ) : null}
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${course.title} progress`}
                >
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {done} of {mods.length} modules complete
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </PartnerShell>
  );
}
