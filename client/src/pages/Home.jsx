import { Link } from "react-router-dom";
import { KeyRound, ListChecks, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const features = [
  {
    icon: KeyRound,
    title: "Sessions",
    description:
      "Access tokens stay in memory. Refresh tokens rotate inside an httpOnly cookie.",
  },
  {
    icon: ShieldCheck,
    title: "Roles",
    description:
      "One guard covers signed-in routes and the admin-only user list.",
  },
  {
    icon: ListChecks,
    title: "Items",
    description:
      "Create, search, filter, edit and delete, scoped to the signed-in owner.",
  },
];

export default function Home() {
  const { user } = useAuth();
  useDocumentTitle(null);

  return (
    <div className="space-y-14">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          The baseline is running.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Accounts, roles and a working item flow, wired end to end against
          Express and MongoDB.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {user ? (
            <>
              <Button as={Link} to="/dashboard">
                Open dashboard
              </Button>
              <Button as={Link} to="/profile" variant="secondary">
                View profile
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/register">
                Create account
              </Button>
              <Button as={Link} to="/login" variant="secondary">
                Sign in
              </Button>
            </>
          )}
        </div>
      </section>

      <section id="features" aria-label="What is included">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-background p-6">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <h2 className="mt-4 text-sm font-medium">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
