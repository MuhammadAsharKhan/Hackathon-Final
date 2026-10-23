import Container from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-1 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Baseline</span>
        <span>React, Express and MongoDB</span>
      </Container>
    </footer>
  );
}
