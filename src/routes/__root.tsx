import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in the vault</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist or moved.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium glow-primary">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium glow-primary">Try again</button>
          <a href="/" className="inline-flex items-center justify-center rounded-lg border border-border bg-white/5 px-5 py-2.5 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EditVault — Secure Escrow for Video Editors & Clients" },
      { name: "description", content: "EditVault holds project funds in escrow so clients pay safely and editors get paid the moment work is approved." },
      { name: "author", content: "EditVault" },
      { name: "theme-color", content: "#0B1020" },
      { property: "og:title", content: "EditVault — Secure Escrow for Video Editors & Clients" },
      { property: "og:description", content: "EditVault holds project funds in escrow so clients pay safely and editors get paid the moment work is approved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "EditVault — Secure Escrow for Video Editors & Clients" },
      { name: "twitter:description", content: "EditVault holds project funds in escrow so clients pay safely and editors get paid the moment work is approved." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ff6e6d32-780c-4891-801d-7ee79ac5cbcc/id-preview-4bb9690c--10c42c7d-2c05-480a-904c-54cfa83e2e71.lovable.app-1781179641153.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ff6e6d32-780c-4891-801d-7ee79ac5cbcc/id-preview-4bb9690c--10c42c7d-2c05-480a-904c-54cfa83e2e71.lovable.app-1781179641153.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors theme="dark" position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
