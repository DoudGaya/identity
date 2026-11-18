"use client";
import { useConsole } from "./context";
import { Overview } from "./overview";
import { Setup } from "./setup";
import {
  NewVerification,
  Verifications,
  VerificationDetail,
  Customers,
  CustomerDetail,
} from "./verifications";
import { ApiKeys, Webhooks, WebhookDetail, Deliveries } from "./developers";
import {
  Activity,
  ApiRequests,
  Compliance,
  Playground,
  UsagePage,
} from "./operations";
import {
  Security,
  Support,
  Team,
  VerificationSettings,
  WorkspaceSettings,
} from "./settings";
export function DashboardPage({
  page,
  recordId,
}: {
  page: string;
  recordId?: string;
}) {
  const { workspace, environment } = useConsole();
  let content: React.ReactNode;
  if (!workspace && !["setup", "security", "support"].includes(page))
    content = <Setup />;
  else
    switch (page) {
      case "overview":
        content = <Overview />;
        break;
      case "setup":
        content = <Setup />;
        break;
      case "verifications":
        content = <Verifications />;
        break;
      case "new-verification":
        content = <NewVerification />;
        break;
      case "verification-detail":
        content = <VerificationDetail id={recordId!} />;
        break;
      case "customers":
        content = <Customers />;
        break;
      case "customer-detail":
        content = <CustomerDetail id={recordId!} />;
        break;
      case "keys":
        content = <ApiKeys />;
        break;
      case "webhooks":
        content = <Webhooks />;
        break;
      case "webhook-detail":
        content = <WebhookDetail id={recordId!} />;
        break;
      case "deliveries":
        content = <Deliveries />;
        break;
      case "requests":
        content = <ApiRequests />;
        break;
      case "playground":
        content = <Playground />;
        break;
      case "activity":
        content = <Activity />;
        break;
      case "usage":
        content = <UsagePage />;
        break;
      case "billing":
        content = <UsagePage billing />;
        break;
      case "settings":
        content = <WorkspaceSettings />;
        break;
      case "team":
        content = <Team />;
        break;
      case "security":
        content = <Security />;
        break;
      case "verification-settings":
        content = <VerificationSettings />;
        break;
      case "compliance":
        content = <Compliance />;
        break;
      default:
        content = <Support />;
    }
  return (
    <div key={`${workspace?.id}:${environment}:${page}:${recordId || ""}`}>
      {content}
    </div>
  );
}
