import { notFound } from "next/navigation";
import { DashboardPage } from "@/components/console/pages";
import { dashboardRoute } from "@/lib/console/routes";
type Props = { params: Promise<{ path?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const route = dashboardRoute((await params).path);
  return { title: route?.title || "Page not found" };
}
export default async function Page({ params }: Props) {
  const route = dashboardRoute((await params).path);
  if (!route) notFound();
  return (
    <DashboardPage
      page={route.page}
      recordId={"recordId" in route ? route.recordId : undefined}
    />
  );
}
