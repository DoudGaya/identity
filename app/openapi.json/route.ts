import { partnerOpenApi } from "@/lib/console/openapi";
export function GET() {
  return Response.json(partnerOpenApi, {
    headers: {
      "Content-Disposition": 'inline; filename="nillar-identity-openapi.json"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
