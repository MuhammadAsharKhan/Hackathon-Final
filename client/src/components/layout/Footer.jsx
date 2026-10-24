import Container from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-1 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>HCM Lite</span>
        <span>Human capital management</span>
      </Container>
    </footer>
  );
}
