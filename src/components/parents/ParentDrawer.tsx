import React, { useEffect, useState } from 'react';
import {
  LinkIcon,
  MailIcon,
  PhoneIcon,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Badge, StatusBadge } from '../ui/Badge';
import { ComboboxField } from '../ui/ComboboxField';
import { Button, ErrorState, FieldRow, LoadingState, Panel } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useEleves } from '../../hooks/useEleves';
import { formatDate, humanize, initiales, str } from '../../utils/format';
import {
  ecoleEnfantsDuParent,
  ecoleGenererCodeAcces,
  ecoleGetCodeAcces,
  ecoleGetParent,
  ecoleLierEnfantAuParent,
  ecoleGetCodeEnveloppeParent,
  ecoleGenererCodeEnveloppeParent,
} from '../../lib/api_ecole';

// ═══════════════════════════════════════════════════════════════════════
// SECTION — CODE D'ACTIVATION ENVELOPPE
// ═══════════════════════════════════════════════════════════════════════

function CodeEnveloppeSection({ parentId }: { parentId: string }) {
  const [code, setCode] = useState<Awaited<ReturnType<typeof ecoleGetCodeEnveloppeParent>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ecoleGetCodeEnveloppeParent(parentId);
      setCode(res);
    } catch (e) {
      setError(String(e));
      setCode(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parentId) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const generer = async (force: boolean = false) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await ecoleGenererCodeEnveloppeParent(parentId, force);
      setCode(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const copier = async () => {
    if (!code?.code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponible */
    }
  };

  if (loading) return <LoadingState />;

  // ── Enveloppe déjà activée ──────────────────────────────────
  if (code?.deja_active) {
    return (
      <div className="rounded-win border border-state-successFg/30 bg-state-successBg/40 p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-state-successFg" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-win-text">
              Accès portail déjà activé
            </div>
            <div className="mt-1 text-2xs text-win-muted">
              Ce parent a activé son accès
              {code.active_le && ` le ${formatDate(code.active_le)}`}.
              {code.code_utilise && (
                <>
                  {' '}Code utilisé :{' '}
                  <code className="rounded bg-win-panel px-1 font-mono text-win-text">
                    {code.code_utilise}
                  </code>
                </>
              )}
            </div>
            <div className="mt-2 text-2xs text-win-muted">
              Pour régénérer un code (réinstallation, nouvel appareil,
              perte d'accès), cliquez ci-dessous. L'accès actuel sera
              révoqué et le parent devra ressaisir le nouveau code.
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              icon={<RefreshCw size={12} />}
              onClick={() => generer(true)}
              disabled={generating}
            >
              {generating ? 'Régénération…' : "Régénérer un code d'activation"}
            </Button>
            {error && (
              <p className="mt-2 text-2xs text-state-dangerFg">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Aucun code généré ──────────────────────────────────────
  if (!code?.code) {
    return (
      <div className="rounded-win border border-win-border bg-win-surface2 p-3">
        <div className="flex items-start gap-2">
          <KeyRound size={16} className="mt-0.5 shrink-0 text-win-muted" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-win-text">
              Code d'activation du portail
            </div>
            <div className="mt-1 text-2xs text-win-muted">
              Générez un code à remettre au parent. Il l'utilisera pour
              activer son accès à cet établissement, avant de pouvoir
              rattacher ses enfants.
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              icon={<KeyRound size={12} />}
              onClick={() => generer(false)}
              disabled={generating}
            >
              {generating ? 'Génération…' : "Générer un code d'activation"}
            </Button>
            {error && (
              <p className="mt-2 text-2xs text-state-dangerFg">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Code prêt à être remis ─────────────────────────────────
  return (
    <div className="rounded-win border border-state-warningFg/40 bg-state-warningBg/40 p-3">
      <div className="flex items-start gap-2">
        <KeyRound size={16} className="mt-0.5 shrink-0 text-state-warningFg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-win-text">
              Code d'activation en attente
            </span>
            <Badge tone="warning">Non utilisé</Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-win border border-win-border bg-win-surface px-3 py-2 font-mono text-sm tracking-widest text-win-text">
              {code.code}
            </code>
            <Button
              variant="ghost"
              size="sm"
              icon={copied ? <Check size={12} /> : <Copy size={12} />}
              onClick={copier}
            >
              {copied ? 'Copié' : 'Copier'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={12} />}
              onClick={() => generer(true)}
              disabled={generating}
            >
              {generating ? 'Régénération…' : 'Régénérer'}
            </Button>
          </div>

          <div className="mt-2 text-2xs text-win-muted">
            Communiquez ce code au parent. Il le saisira sur l'écran
            « Activer un établissement » de son application parent.
            Le code reste valide jusqu'à utilisation.
          </div>

          {error && <p className="mt-2 text-2xs text-state-dangerFg">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DRAWER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

export function ParentDrawer({
  parentId,
  onClose,
  onChanged,
}: {
  parentId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const open = !!parentId;
  const id = parentId ?? '';
  const parent = useResource(() => ecoleGetParent(id), [id], open);
  const enfants = useResource(() => ecoleEnfantsDuParent(id), [id], open);
  const { options: optionsEleves, eleves } = useEleves(open);

  const [eleveId, setEleveId] = useState('');
  const liaison = useSubmit();

  if (!parentId) return null;
  const p = parent.data;
  const dejaLies = new Set((enfants.data ?? []).map((e) => e.eleve_id));

  function lier() {
    if (!eleveId) return liaison.setError('Choisissez un élève.');
    liaison.run(
      async () => {
        // Récupère le code d'appairage de l'élève, ou le génère s'il n'existe pas
        const existant = await ecoleGetCodeAcces(eleveId);
        const code = existant?.code
          ? String(existant.code)
          : (await ecoleGenererCodeAcces(eleveId)).code;
        await ecoleLierEnfantAuParent(id, { code });
      },
      () => {
        setEleveId('');
        enfants.reload();
        onChanged?.();
      }
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={p ? `${p.prenom} ${p.nom}` : 'Compte parent'}
      subtitle={p?.profession ? String(p.profession) : undefined}
      width="w-[560px]"
    >
      {parent.loading && <LoadingState />}
      {parent.error && (
        <ErrorState message={parent.error} onRetry={parent.reload} />
      )}

      {p && (
        <div className="space-y-3">
          {/* ════════ EN-TÊTE PARENT ════════ */}
          <div className="flex items-start gap-3 rounded-win border border-win-border bg-win-surface p-3 shadow-win">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-win bg-win-accentSoft text-sm font-semibold text-win-accent">
              {initiales(p.nom, p.prenom)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={p.peut_se_connecter_portail ? 'success' : 'neutral'}>
                  {p.peut_se_connecter_portail
                    ? 'Accès portail actif'
                    : 'Accès portail inactif'}
                </Badge>
                {p.doit_changer_mot_de_passe && (
                  <Badge tone="warning">Mot de passe provisoire</Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-2xs">
                <a
                  href={`tel:${p.telephone}`}
                  className="inline-flex items-center gap-1 text-win-accent"
                >
                  <PhoneIcon size={11} /> {p.telephone}
                </a>
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    className="inline-flex items-center gap-1 text-win-accent"
                  >
                    <MailIcon size={11} /> {p.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ════════ COORDONNÉES ════════ */}
          <Panel title="Coordonnées">
            <dl>
              <FieldRow label="Téléphone secondaire">
                {str(p.telephone_secondaire)}
              </FieldRow>
              <FieldRow label="Adresse">{str(p.adresse)}</FieldRow>
              <FieldRow label="Profession">{str(p.profession)}</FieldRow>
              <FieldRow label="Compte créé le">
                {p.created_at ? formatDate(p.created_at) : '—'}
              </FieldRow>
            </dl>
          </Panel>

          {/* ════════ CODE D'ACTIVATION ENVELOPPE ════════ */}
          <Panel
            title="Code d'activation établissement"
            subtitle="À remettre au parent pour activer son accès"
          >
            <CodeEnveloppeSection parentId={id} />
          </Panel>

          {/* ════════ ENFANTS RATTACHÉS ════════ */}
          <Panel
            title="Enfants rattachés"
            subtitle={`${(enfants.data ?? []).length} enfant(s)`}
            bodyClassName=""
          >
            {enfants.loading && <LoadingState />}
            {enfants.error && (
              <ErrorState message={enfants.error} onRetry={enfants.reload} />
            )}
            <ul className="divide-y divide-win-border">
              {(enfants.data ?? []).map((e) => (
                <li key={e.eleve_id} className="flex items-center gap-3 px-3 py-2">
                  {e.photo_url ? (
                    <img
                      src={e.photo_url}
                      alt=""
                      className="h-8 w-8 rounded-win object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-win bg-win-panel text-2xs font-semibold text-win-muted">
                      {initiales(e.nom, e.prenom)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-win-text">
                      {e.prenom} {e.nom}
                    </span>
                    <span className="block text-2xs text-win-muted">
                      Matricule {e.matricule} · {humanize(e.lien)}
                    </span>
                  </span>
                  <StatusBadge value={e.statut} />
                </li>
              ))}
              {!enfants.loading && (enfants.data ?? []).length === 0 && (
                <li className="px-3 py-4 text-2xs text-win-muted">
                  Aucun enfant rattaché à ce compte.
                </li>
              )}
            </ul>
          </Panel>

          {/* ════════ RATTACHER UN ENFANT ════════ */}
          <Panel
            title="Rattacher un enfant"
            subtitle="Le code d'appairage de l'élève est utilisé automatiquement"
          >
            <div className="flex flex-wrap items-end gap-2">
              <ComboboxField
                className="min-w-[260px] flex-1"
                label="Élève"
                value={eleveId}
                onChange={setEleveId}
                loading={eleves.loading}
                options={optionsEleves.filter((o) => !dejaLies.has(o.value))}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<LinkIcon size={12} />}
                onClick={lier}
                disabled={liaison.submitting}
              >
                {liaison.submitting ? 'Liaison…' : 'Rattacher'}
              </Button>
            </div>
            {liaison.error && (
              <p className="mt-2 text-2xs text-state-dangerFg">
                {liaison.error}
              </p>
            )}
          </Panel>
        </div>
      )}
    </Drawer>
  );
}