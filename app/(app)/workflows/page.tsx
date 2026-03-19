import { WorkflowsDashboard } from "@/components/workflows/workflows-dashboard";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function WorkflowsPage({ searchParams }: Props) {
  const { section = "dashboard" } = await searchParams;
  return <WorkflowsDashboard section={section} />;
}
