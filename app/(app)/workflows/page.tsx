import { WorkflowsDashboard } from "@/components/workflows/workflows-dashboard";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function WorkflowsPage({ searchParams }: Props) {
  const { section = "onboarding" } = await searchParams;
  return <WorkflowsDashboard section={section} />;
}
