import { useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useDisconnectNrsCredentials, useNrsCredentialStatus, useSaveNrsCredentials, useSaveNrsCrypto, useValidateNrsCrypto } from "@/hooks/useNrsCredentials";
import { canAdministerCredentials, isSigningReady, cryptoStatusLabel } from "@/lib/nrs/credentialContract";

export function TaxpayerCredentials({ companyName, environment, environmentUnsaved }: {
  companyName: string; environment: string; environmentUnsaved: boolean;
}) {
  const { companyId, roles } = useAuth();
  const status = useNrsCredentialStatus(environment);
  const save = useSaveNrsCredentials();
  const disconnect = useDisconnectNrsCredentials();
  const saveCrypto = useSaveNrsCrypto(environment);
  const validateCrypto = useValidateNrsCrypto(environment);
  const [publicKey, setPublicKey] = useState("");
  const [certificate, setCertificate] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const admin = canAdministerCredentials(roles, companyId);
  const metadata = status.data;
  const busy = save.isPending || disconnect.isPending || saveCrypto.isPending || validateCrypto.isPending;
  const scopeMatches = metadata?.environment === environment;
  const blocked = !admin || busy || status.isFetching || status.isError || !metadata || !scopeMatches || environmentUnsaved;

  async function saveCredentials(event: React.FormEvent) {
    event.preventDefault();
    if (blocked) return;
    setNotice(""); setFailure("");
    try {
      await save.mutateAsync({ api_key: apiKey, api_secret: apiSecret });
      setNotice("API credentials saved. Saving does not verify SI readiness or connect the APP.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not save credentials.");
    } finally {
      setApiKey(""); setApiSecret(""); save.reset();
    }
  }

  async function removeCredentials() {
    if (blocked) return;
    setNotice(""); setFailure("");
    try {
      await disconnect.mutateAsync();
      setApiKey(""); setApiSecret("");
      setConfirmDisconnect(false);
      setNotice("Taxpayer credentials disconnected. Company identifiers and APP onboarding are unchanged.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not disconnect credentials.");
    }
  }

  async function saveCryptoValues(event: React.FormEvent) {
    event.preventDefault();
    if (blocked) return;
    setNotice(""); setFailure("");
    try {
      await saveCrypto.mutateAsync(() => ({ public_key: publicKey, certificate }));
      setNotice("Crypto save request completed. Review refreshed metadata; saving is not NRS verification.");
    } catch {
      setFailure("Crypto save was not confirmed. Refresh status before trying again.");
    } finally {
      setPublicKey(""); setCertificate(""); saveCrypto.reset();
    }
  }

  async function checkCryptoFormat() {
    if (blocked) return;
    setNotice(""); setFailure("");
    try {
      await validateCrypto.mutateAsync();
      setNotice("Local format check completed. Review refreshed metadata; this does not verify NRS certificate or signature acceptance.");
    } catch {
      setFailure("Local format check did not confirm validity. Review refreshed crypto status.");
    } finally { validateCrypto.reset(); }
  }

  return <section className="space-y-4 border-t border-border pt-6" aria-labelledby="taxpayer-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 id="taxpayer-heading" className="text-sm font-semibold">SI taxpayer credentials</h4>
        <p className="mt-1 text-sm text-muted-foreground">{companyName} · Saved environment: {environment}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void status.refetch()} disabled={busy || status.isFetching}>
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh status
      </Button>
    </div>
    <p className="text-sm text-muted-foreground">Separate from APP onboarding and TeamSource sign-in. Requests use your authenticated active company; no company ID or global credentials are supplied by this form.</p>
    <p className="text-xs text-muted-foreground">API credentials and crypto belong to your active company and saved environment. The credential service resolves this scope; save environment changes before making updates.</p>
    {environmentUnsaved && <p role="alert" className="text-sm text-warning">Save the company environment before managing credentials.</p>}
    {status.isFetching && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading credential metadata…</p>}
    {status.isError && <p role="alert" className="text-sm text-destructive">{status.error.message}</p>}
    {metadata && !status.isError && <>
      {!scopeMatches && <p role="alert" className="text-sm text-destructive">The server environment differs from the saved company environment. Refresh company settings before making changes.</p>}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Metadata label="API key" value={yesNo(metadata.api_key_configured, "Saved", "Not saved")} />
        <Metadata label="API secret" value={yesNo(metadata.api_secret_configured, "Saved", "Not saved")} />
        <Metadata label="Credentials verified (server record)" value={metadata.credentials_verified === true ? `Recorded${metadata.verified_at ? ` · ${metadata.verified_at}` : ""}` : yesNo(metadata.credentials_verified, "", "Not verified")} />
        <Metadata label="Crypto keys" value={yesNo(metadata.crypto_configured, "Configured", "Not configured")} />
        <Metadata label="Crypto format status" value={cryptoStatusLabel(metadata.crypto_status)} />
        <Metadata label="Crypto verification record" value={metadata.crypto_verified_at ? `Server record · ${metadata.crypto_verified_at} (not proof of NRS acceptance)` : "No NRS verification established"} />
        {metadata.connection_status && <Metadata label="Connection status (server)" value={metadata.connection_status} />}
        <Metadata label="NRS sandbox signing readiness" value={isSigningReady(metadata) ? "Credentials and crypto reported configured" : "Not established"} />
      </dl>
      {metadata.taxpayer_password_configured && <p className="text-xs text-muted-foreground">A legacy taxpayer password is stored. It is not exposed or used by this screen. Disconnect removes all credentials supported by this contract.</p>}
      {metadata.last_error && <p className="text-xs text-muted-foreground">A previous API verification error was recorded.</p>}
      {metadata.crypto_validation_error && <p role="alert" className="text-sm text-destructive">{metadata.crypto_validation_error}</p>}
    </>}
    {admin ? <form onSubmit={saveCredentials} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="taxpayer-api-key">Taxpayer API key</Label><Input id="taxpayer-api-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} disabled={blocked} maxLength={4096} /></div>
        <div className="space-y-1.5"><Label htmlFor="taxpayer-api-secret">Taxpayer API secret</Label><Input id="taxpayer-api-secret" type="password" autoComplete="new-password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} disabled={blocked} maxLength={4096} /></div>
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> Saved values are never returned or prefilled. Entries are sent only to the credential service and cleared after each save attempt; never saved on this device.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={blocked || !apiKey.trim() || !apiSecret.trim()}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save API credentials</Button>
        <Button type="button" variant="outline" disabled={blocked || !(metadata?.api_key_configured || metadata?.api_secret_configured || metadata?.taxpayer_password_configured)} onClick={() => setConfirmDisconnect(true)}><Unplug className="mr-2 h-4 w-4" />Disconnect taxpayer credentials</Button>
      </div>
    </form> : <p className="text-sm text-muted-foreground">Only an active company administrator can save or disconnect taxpayer credentials.</p>}
    <div className="space-y-4 border-t border-border pt-4">
      <h5 className="text-sm font-semibold">Taxpayer crypto setup</h5>
      <p className="text-sm text-muted-foreground">Use the public_key and certificate values from your taxpayer NRS crypto_keys.txt. Local format validation is not NRS-verified certificate or signature acceptance.</p>
      {admin && <form onSubmit={saveCryptoValues} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="taxpayer-public-key">Public key (PEM / Base64 PEM)</Label><Input id="taxpayer-public-key" type="password" autoComplete="off" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} disabled={blocked} /></div>
          <div className="space-y-1.5"><Label htmlFor="taxpayer-certificate">NRS certificate value</Label><Input id="taxpayer-certificate" type="password" autoComplete="off" value={certificate} onChange={(e) => setCertificate(e.target.value)} disabled={blocked} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Stored values are never shown or prefilled. Both entries are cleared after every save attempt.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={blocked || !publicKey.trim() || !certificate.trim()}>{saveCrypto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save crypto values</Button>
          <Button type="button" variant="outline" disabled={blocked || metadata?.crypto_configured !== true} onClick={() => void checkCryptoFormat()}>{validateCrypto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Check saved crypto format</Button>
        </div>
      </form>}
    </div>
    {notice && <p role="status" className="text-sm text-foreground">{notice}</p>}
    {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
    <AlertDialog open={confirmDisconnect} onOpenChange={(open) => { if (!busy) setConfirmDisconnect(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Disconnect taxpayer credentials?</AlertDialogTitle><AlertDialogDescription>Remove all stored API credentials and any legacy taxpayer password for {companyName}. This applies to the saved {environment} environment; other environments are not selected by this form. Company identifiers and the APP onboarding draft remain unchanged.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={blocked} onClick={() => void removeCredentials()}>{disconnect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Disconnect</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}

function yesNo(v: boolean | null, yes: string, no: string) {
  return v === null ? "Not reported" : v ? yes : no;
}

function Metadata({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium break-words">{value}</dd></div>;
}