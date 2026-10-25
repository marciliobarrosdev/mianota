import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PwaInstallGuide } from "@/components/pwa-install-guide";
import { BrandProvider } from "@/components/brand-provider";
import { Toaster } from "@/components/ui/sonner";
import { supportConfigured, supportWhatsappUrl, supportWhatsappDisplay } from "@/config/brand";
import { brand, cloneBrandCssVariables, normalizeCloneBrand } from "@/config/brand";
import { getPublicCloneBrand } from "@/lib/public-brand.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço pode ter mudado ou não existe mais.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
        {supportConfigured && (
          <p className="mt-6 text-xs text-muted-foreground">
            Precisa de ajuda?{" "}
            <a
              href={supportWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Falar com suporte ({supportWhatsappDisplay})
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo não saiu como esperado. Atualize a tela ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
        {supportConfigured && (
          <p className="mt-6 text-xs text-muted-foreground">
            Precisa de ajuda?{" "}
            <a
              href={supportWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Falar com suporte ({supportWhatsappDisplay})
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getPublicCloneBrand(),
  staleTime: 60_000,
  head: ({ loaderData }) => {
    const cloneBrand = normalizeCloneBrand(loaderData || brand);
    const ogImage = String(import.meta.env.VITE_OG_IMAGE_URL || "").trim();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: cloneBrand.primary },
        { name: "application-name", content: cloneBrand.shortName },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: cloneBrand.shortName },
        { name: "format-detection", content: "telephone=no" },
        { title: `${cloneBrand.name} — ${cloneBrand.tagline}` },
        { name: "description", content: cloneBrand.description },
        { name: "author", content: cloneBrand.name },
        { property: "og:title", content: `${cloneBrand.name} — ${cloneBrand.tagline}` },
        { property: "og:description", content: cloneBrand.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: `${cloneBrand.name} — ${cloneBrand.tagline}` },
        { name: "twitter:description", content: cloneBrand.description },
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { name: "twitter:image", content: ogImage },
            ]
          : []),
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/api/manifest.webmanifest" },
        {
          rel: "icon",
          href: cloneBrand.iconUrl || cloneBrand.logoUrl || "/icons/marcia-app.svg",
          type: cloneBrand.iconUrl || cloneBrand.logoUrl ? undefined : "image/svg+xml",
        },
        {
          rel: "apple-touch-icon",
          href: cloneBrand.iconUrl || cloneBrand.logoUrl || "/icons/apple-touch-icon.png",
          sizes: "180x180",
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const NO_FLASH_THEME = `(()=>{try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  const initialBrand = normalizeCloneBrand(Route.useLoaderData() || brand);
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      style={cloneBrandCssVariables(initialBrand) as CSSProperties}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const initialBrand = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider initialBrand={initialBrand}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster richColors position="top-right" />
        <PwaInstallGuide />
      </BrandProvider>
    </QueryClientProvider>
  );
}
