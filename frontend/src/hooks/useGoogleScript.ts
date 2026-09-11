/**
 * Shared hook for loading Google Identity Services script and rendering the Google button.
 * Used by both login and register pages.
 */
import { useEffect, useRef } from 'react';

interface UseGoogleScriptOptions {
  enabled: boolean;
  clientId: string;
  containerId: string;
  context: 'signin' | 'signup';
  text: 'signin_with' | 'signup_with';
  onCallback: (response: { credential: string }) => void;
}

export function useGoogleScript({
  enabled,
  clientId,
  containerId,
  context,
  text,
  onCallback,
}: UseGoogleScriptOptions) {
  const callbackRef = useRef(onCallback);
  callbackRef.current = onCallback;

  useEffect(() => {
    if (!enabled || !clientId) return;

    const initButton = () => {
      const el = document.getElementById(containerId);
      if (!el || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: callbackRef.current,
        auto_select: false,
        context,
        ux_mode: 'popup',
      });
      window.google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text,
        shape: 'pill',
        logo_alignment: 'center',
      });
    };

    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) {
      initButton();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initButton();
    document.head.appendChild(script);
  }, [enabled, clientId, containerId, context, text]);
}
