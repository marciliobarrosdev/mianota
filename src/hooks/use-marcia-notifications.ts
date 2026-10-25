import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/auth/realm-supabase";

type PushState = "idle" | "checking" | "activating" | "active" | "error";

type UseMarciaNotificationsOptions = {
  companyId?: string | null;
  userId?: string | null;
};

function canUsePush() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);

  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Não foi possível ativar as notificações neste aparelho.";
}

export function useMarciaNotifications({ companyId, userId }: UseMarciaNotificationsOptions) {
  const supported = useMemo(canUsePush, []);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [state, setState] = useState<PushState>(supported ? "checking" : "idle");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    // This only inspects an existing registration/subscription. Permission is
    // requested exclusively by activate(), after an explicit user action.
    async function inspectExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();

        if (!subscription || !companyId || !userId) {
          if (!cancelled) {
            setIsSubscribed(false);
            setState("idle");
          }
          return;
        }

        const { data, error: lookupError } = await (supabase as any)
          .from("marcia_push_subscription")
          .select("id")
          .eq("company_id", companyId)
          .eq("user_id", userId)
          .eq("endpoint", subscription.endpoint)
          .eq("active", true)
          .maybeSingle();

        if (cancelled) return;
        const registered = !lookupError && Boolean(data);
        setIsSubscribed(registered);
        setState(registered ? "active" : "idle");
      } catch {
        if (!cancelled) {
          setIsSubscribed(false);
          setState("idle");
        }
      }
    }

    void inspectExistingSubscription();

    return () => {
      cancelled = true;
    };
  }, [companyId, supported, userId]);

  const activate = useCallback(async () => {
    setError("");

    if (!supported) {
      const nextError = "Este navegador não oferece notificações push para este aplicativo.";
      setError(nextError);
      setState("error");
      return { ok: false as const, error: nextError };
    }

    if (!companyId || !userId) {
      const nextError = "Não foi possível identificar sua empresa e seu usuário.";
      setError(nextError);
      setState("error");
      return { ok: false as const, error: nextError };
    }

    const vapidPublicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();
    if (!vapidPublicKey) {
      const nextError = "A chave pública de notificações ainda não foi configurada neste clone.";
      setError(nextError);
      setState("error");
      return { ok: false as const, error: nextError };
    }

    setState("activating");

    try {
      // Browsers require this call to happen inside the click/tap handler.
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        throw new Error(
          nextPermission === "denied"
            ? "As notificações foram bloqueadas no navegador. Libere-as nas configurações do site."
            : "A permissão para notificações não foi concedida.",
        );
      }

      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      // A assinatura do navegador pode ter pertencido à conta usada antes
      // neste aparelho. Se ela não está registrada para o tenant atual,
      // descarte-a antes de criar uma nova para não misturar destinatários.
      if (subscription && !isSubscribed) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const serialized = subscription.toJSON();
      const p256dh = serialized.keys?.p256dh;
      const authSecret = serialized.keys?.auth;

      if (!serialized.endpoint || !p256dh || !authSecret) {
        throw new Error("O navegador não devolveu uma assinatura push válida.");
      }

      const { error: saveError } = await (supabase as any).from("marcia_push_subscription").upsert(
        {
          company_id: companyId,
          user_id: userId,
          endpoint: serialized.endpoint,
          p256dh,
          auth_secret: authSecret,
          user_agent: navigator.userAgent,
          active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

      if (saveError) throw saveError;

      setIsSubscribed(true);
      setState("active");
      return { ok: true as const };
    } catch (nextError) {
      const nextMessage = messageFrom(nextError);
      setError(nextMessage);
      setState("error");
      return { ok: false as const, error: nextMessage };
    }
  }, [companyId, isSubscribed, supported, userId]);

  return {
    activate,
    error,
    isActivating: state === "activating",
    isSubscribed,
    permission,
    state,
    supported,
  };
}
