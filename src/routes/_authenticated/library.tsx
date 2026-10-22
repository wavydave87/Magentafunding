import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Download, ExternalLink, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PortalGuard } from "@/components/partner/portal-guard";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LIBRARY_CATEGORIES } from "@/lib/partner-portal";
import { fileSizeLabel, openResource } from "@/lib/partner-resources";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Partner Library — Magenta Portal" },
      {
        name: "description",
        content:
          "Publish the resources, training courses and FAQs that every Magenta partner organization sees.",
      },
      { property: "og:title", content: "Partner Library — Magenta Portal" },
      { property: "og:description", content: "Manage partner resources, training and FAQs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal" requireAdmin>
      <LibraryPage />
    </PortalGuard>
  ),
});

function LibraryPage() {
  return (
    <AppShell>
      <PortalPageHeader
        title="Partner Library"
        subtitle="Anything published here appears instantly in every partner's Resources, Training and Support screens."
      />
      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>
        <TabsContent value="resources" className="mt-5">
          <ResourcesManager />
        </TabsContent>
        <TabsContent value="training" className="mt-5">
          <TrainingManager />
        </TabsContent>
        <TabsContent value="faqs" className="mt-5">
          <FaqManager />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ResourcesManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: LIBRARY_CATEGORIES[0] as string,
    link_url: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["library-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_resources")
        .select(
          "id, title, description, category, kind, published, file_name, file_size, link_url, storage_path",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Give the resource a title.");
      if (!file && !form.link_url.trim()) throw new Error("Attach a file or add a link.");

      let storagePath: string | null = null;
      if (file) {
        storagePath = `library/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage
          .from("partner-resources")
          .upload(storagePath, file);
        if (error) throw new Error(error.message);
      }

      const { error } = await supabase.from("partner_resources").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        kind: file ? "file" : "link",
        link_url: file ? null : form.link_url.trim(),
        storage_path: storagePath,
        file_name: file?.name ?? null,
        file_size: file?.size ?? null,
        published: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Resource published.");
      setForm({ title: "", description: "", category: LIBRARY_CATEGORIES[0] as string, link_url: "" });
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["library-resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("partner_resources")
        .update({ published })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library-resources"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_resources").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library-resources"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form
        className="card-elevated grid h-fit gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-display text-lg">Publish a Resource</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="res-title">Title</Label>
          <Input
            id="res-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="res-desc">Description</Label>
          <Textarea
            id="res-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="res-cat">Category</Label>
          <select
            id="res-cat"
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="res-file">File</Label>
          <Input
            id="res-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="res-link">…or a link</Label>
          <Input
            id="res-link"
            type="url"
            placeholder="https://"
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {create.isPending ? "Publishing…" : "Publish"}
        </Button>
      </form>

      <div>
        {isLoading ? (
          <div className="card-elevated h-40 animate-pulse bg-muted/40" />
        ) : (data ?? []).length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing published yet.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {(data ?? []).map((r) => (
              <LibraryResourceRow
                key={r.id}
                resource={r}
                onTogglePublish={() =>
                  togglePublish.mutate({ id: r.id, published: !r.published })
                }
                onDelete={() => remove.mutate(r.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  kind: string;
  published: boolean;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  storage_path: string | null;
}

/**
 * A published resource has to be openable from here, not just listed — the
 * title opens the file or link, and the row expands for the full detail.
 */
function LibraryResourceRow({
  resource,
  onTogglePublish,
  onDelete,
}: {
  resource: LibraryResource;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const size = fileSizeLabel(resource.file_size);

  return (
    <li className="card-elevated p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${resource.title}`}
          className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <div className="min-w-[12rem] flex-1">
          <button
            type="button"
            onClick={() => void openResource(resource)}
            className="focus-ring rounded text-left font-medium underline-offset-4 hover:underline"
          >
            {resource.title}
          </button>
          <p className="text-xs text-muted-foreground">
            {resource.category} · {resource.file_name ?? resource.link_url}
          </p>
        </div>
        <ToneBadge
          label={resource.published ? "Published" : "Hidden"}
          tone={resource.published ? "success" : "muted"}
        />
        <Button variant="secondary" size="sm" onClick={() => void openResource(resource)}>
          {resource.kind === "link" ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Open
        </Button>
        <Button variant="outline" size="sm" onClick={onTogglePublish}>
          {resource.published ? "Hide" : "Publish"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete ${resource.title}`}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {open ? (
        <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Description</dt>
            <dd>{resource.description ?? "No description added."}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd className="capitalize">{resource.kind}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Category</dt>
            <dd>{resource.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {resource.kind === "link" ? "Link" : "File"}
            </dt>
            <dd className="break-all">
              {resource.kind === "link"
                ? (resource.link_url ?? "—")
                : `${resource.file_name ?? "—"}${size ? ` · ${size}` : ""}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Visible to partners</dt>
            <dd>{resource.published ? "Yes" : "No"}</dd>
          </div>
        </dl>
      ) : null}
    </li>
  );
}



function TrainingManager() {
  const queryClient = useQueryClient();
  const [course, setCourse] = useState({
    title: "",
    description: "",
    category: LIBRARY_CATEGORIES[0] as string,
  });
  const [moduleForm, setModuleForm] = useState({
    training_id: "",
    title: "",
    kind: "video" as "video" | "document" | "link",
    content_url: "",
    duration_minutes: "",
  });

  const { data } = useQuery({
    queryKey: ["library-training"],
    queryFn: async () => {
      const [courses, modules] = await Promise.all([
        supabase
          .from("partner_trainings")
          .select("id, title, category, published")
          .order("sort_order"),
        supabase
          .from("partner_training_modules")
          .select("id, training_id, title, kind, content_url, duration_minutes, sort_order")
          .order("sort_order"),
      ]);
      if (courses.error) throw new Error(courses.error.message);
      return { courses: courses.data ?? [], modules: modules.data ?? [] };
    },
  });

  const addCourse = useMutation({
    mutationFn: async () => {
      if (!course.title.trim()) throw new Error("Give the course a title.");
      const { error } = await supabase.from("partner_trainings").insert({
        title: course.title.trim(),
        description: course.description.trim() || null,
        category: course.category,
        published: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Course created.");
      setCourse({ title: "", description: "", category: LIBRARY_CATEGORIES[0] as string });
      await queryClient.invalidateQueries({ queryKey: ["library-training"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addModule = useMutation({
    mutationFn: async () => {
      if (!moduleForm.training_id) throw new Error("Choose a course.");
      if (!moduleForm.title.trim()) throw new Error("Give the module a title.");
      const count = (data?.modules ?? []).filter(
        (m) => m.training_id === moduleForm.training_id,
      ).length;
      const { error } = await supabase.from("partner_training_modules").insert({
        training_id: moduleForm.training_id,
        title: moduleForm.title.trim(),
        kind: moduleForm.kind,
        content_url: moduleForm.content_url.trim() || null,
        duration_minutes: moduleForm.duration_minutes
          ? Number(moduleForm.duration_minutes)
          : null,
        sort_order: count + 1,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Module added.");
      setModuleForm({ ...moduleForm, title: "", content_url: "", duration_minutes: "" });
      await queryClient.invalidateQueries({ queryKey: ["library-training"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="card-elevated grid h-fit gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          addCourse.mutate();
        }}
      >
        <h2 className="font-display text-lg">New Course</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="course-title">Title</Label>
          <Input
            id="course-title"
            value={course.title}
            onChange={(e) => setCourse({ ...course, title: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-desc">Description</Label>
          <Textarea
            id="course-desc"
            rows={3}
            value={course.description}
            onChange={(e) => setCourse({ ...course, description: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-cat">Category</Label>
          <select
            id="course-cat"
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={course.category}
            onChange={(e) => setCourse({ ...course, category: e.target.value })}
          >
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={addCourse.isPending}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Create Course
        </Button>
      </form>

      <form
        className="card-elevated grid h-fit gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          addModule.mutate();
        }}
      >
        <h2 className="font-display text-lg">Add a Module</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="mod-course">Course</Label>
          <select
            id="mod-course"
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={moduleForm.training_id}
            onChange={(e) => setModuleForm({ ...moduleForm, training_id: e.target.value })}
            required
          >
            <option value="">Choose a course…</option>
            {(data?.courses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mod-title">Title</Label>
          <Input
            id="mod-title"
            value={moduleForm.title}
            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mod-kind">Type</Label>
          <select
            id="mod-kind"
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={moduleForm.kind}
            onChange={(e) =>
              setModuleForm({ ...moduleForm, kind: e.target.value as typeof moduleForm.kind })
            }
          >
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="link">Link</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mod-url">Content URL</Label>
          <Input
            id="mod-url"
            type="url"
            placeholder="https://"
            value={moduleForm.content_url}
            onChange={(e) => setModuleForm({ ...moduleForm, content_url: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mod-mins">Duration (minutes)</Label>
          <Input
            id="mod-mins"
            type="number"
            min={1}
            value={moduleForm.duration_minutes}
            onChange={(e) => setModuleForm({ ...moduleForm, duration_minutes: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={addModule.isPending}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Module
        </Button>
      </form>

      <div className="lg:col-span-2">
        <h2 className="mb-3 font-display text-lg">Published Courses</h2>
        <ul className="grid gap-3">
          {(data?.courses ?? []).map((c) => (
            <LibraryCourseRow
              key={c.id}
              course={c}
              modules={(data?.modules ?? []).filter((m) => m.training_id === c.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface LibraryModule {
  id: string;
  title: string;
  kind: string;
  content_url: string | null;
  duration_minutes: number | null;
}

/** Courses expand to their modules, and every module with a URL opens. */
function LibraryCourseRow({
  course,
  modules,
}: {
  course: { id: string; title: string; category: string; published: boolean };
  modules: LibraryModule[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <li className="card-elevated p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${course.title}`}
          className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <div className="min-w-[10rem] flex-1">
          <p className="font-medium">{course.title}</p>
          <p className="text-xs text-muted-foreground">
            {course.category} · {modules.length} module{modules.length === 1 ? "" : "s"}
          </p>
        </div>
        <ToneBadge
          label={course.published ? "Published" : "Hidden"}
          tone={course.published ? "success" : "muted"}
        />
      </div>

      {open ? (
        <ol className="mt-3 grid gap-1 border-t border-border pt-3 text-sm">
          {modules.length === 0 ? (
            <li className="text-muted-foreground">No modules added yet.</li>
          ) : (
            modules.map((m, i) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                {m.content_url ? (
                  <a
                    href={m.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring rounded underline-offset-4 hover:underline"
                  >
                    {m.title}
                  </a>
                ) : (
                  <span>{m.title}</span>
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {m.kind}
                  {m.duration_minutes ? ` · ${m.duration_minutes} min` : ""}
                </span>
              </li>
            ))
          )}
        </ol>
      ) : null}
    </li>
  );
}



function FaqManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: LIBRARY_CATEGORIES[0] as string,
  });

  const { data } = useQuery({
    queryKey: ["library-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_faqs")
        .select("id, question, answer, category, published")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.question.trim() || !form.answer.trim())
        throw new Error("Add both a question and an answer.");
      const { error } = await supabase.from("partner_faqs").insert({
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category,
        published: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("FAQ published.");
      setForm({ question: "", answer: "", category: LIBRARY_CATEGORIES[0] as string });
      await queryClient.invalidateQueries({ queryKey: ["library-faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_faqs").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library-faqs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form
        className="card-elevated grid h-fit gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <h2 className="font-display text-lg">New FAQ</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="faq-q">Question</Label>
          <Input
            id="faq-q"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="faq-a">Answer</Label>
          <Textarea
            id="faq-a"
            rows={5}
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="faq-cat">Category</Label>
          <select
            id="faq-cat"
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={add.isPending}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Publish FAQ
        </Button>
      </form>

      <ul className="grid gap-3">
        {(data ?? []).map((f) => (
          <li key={f.id} className="card-elevated p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{f.question}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{f.answer}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete FAQ ${f.question}`}
                onClick={() => remove.mutate(f.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
