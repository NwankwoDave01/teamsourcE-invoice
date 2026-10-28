import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileCaptchaProps {
  resetKey: number;
  onTokenChange: (token: string | null) => void;
  onError: (message: string) => void;
}

export function TurnstileCaptcha({ resetKey, onTokenChange, onError }: TurnstileCaptchaProps) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

  if (!siteKey) {
    return (
      <p role="alert" className="text-sm text-destructive">
        CAPTCHA is not configured. Please contact support before continuing.
      </p>
    );
  }

  return (
    <Turnstile
      key={resetKey}
      siteKey={siteKey}
      onSuccess={(token) => {
        onTokenChange(token);
        onError("");
      }}
      onExpire={() => {
        onTokenChange(null);
        onError("CAPTCHA expired. Please complete it again before continuing.");
      }}
      onError={() => {
        onTokenChange(null);
        onError("CAPTCHA could not be completed. Check your connection and try again.");
      }}
      options={{ theme: "auto", refreshExpired: "auto" }}
    />
  );
}
