import { Construction } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ComingSoon({ title, description }) {
  useDocumentTitle(title);

  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />

      <EmptyState
        icon={Construction}
        title={`${title} is not built yet`}
        description="This screen arrives with the next frontend step."
      />
    </div>
  );
}
