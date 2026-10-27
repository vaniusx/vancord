import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={() => window.location.reload()}>Yeniden yükle</Button>
    </div>
  );
}
