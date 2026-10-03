// components/enseignants/EnseignantDrawer.tsx
import React, { useMemo, useState } from 'react';
import {
  PlusIcon, RefreshCwIcon, Trash2Icon, UserCogIcon,
} from 'lucide-react';
import { FormDrawer } from '../ui/FormDrawer';
import { ComboboxField } from '../ui/ComboboxField';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import {
  Button, CheckboxField, Divider, ErrorState, LoadingState,
  StatTile, TextField,
} from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useReferentielEcole } from '../../hooks/useReferentielEcole';
import { useApp } from '../../contexts/AppContext';
import { aujourdHui } from '../../utils/format';
import {
  ecoleActiverPortailEnseignant,
  ecoleAffecterMasse,
  ecoleChargeHoraireEnseignant,
  ecoleListerAffectationsEnseignant,
  ecoleParcoursEnseignant,
  ecoleRecalculerParcoursEnseignant,
  ecoleRetirerAffectation,
} from '../../lib/api_ecole_extended';
import {
  ecoleEdtEnseignant,
  ecoleListerMatieresClasse,
} from '../../lib/api_ecole';
import type { Enseignant } from '../../lib/api_ecole';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Types locaux — retour de l'API, on ne réinvente rien
interface AffectationAPI {
  affectation_id: string;
  matiere_classe_id: string;
  matiere: string;
  classe_libelle: string;
  coefficient: number;
  volume_horaire_hebdo: number;
  date_debut: string;
  statut: string;
}

interface ChargeAPI {
  total_heures_hebdo_reelles: number;
  volume_horaire_contractuel: number | null;
  ecart_vs_contrat: number | null;
  alerte_charge: string | null;
  nb_classes: number;
  nb_matieres: number;
  detail_par_classe: {
    classe_id: string;
    classe_libelle: string;
    heures_hebdo: number;
    matieres: { matiere: string; coefficient: number; heures_hebdo: number }[];
  }[];
}

export function EnseignantDrawer({
  enseignant,
  onClose,
}: {
  enseignant: Enseignant | null;
  onClose: () => void;
}) {
  const { anneeId } = useApp();
  const [tab, setTab] = useState('affectations');
  const [affecterOuvert, setAffecterOuvert] = useState(false);
  const [portailMsg, setPortailMsg] = useState<string | null>(null);

  const portailSubmit = useSubmit();
  const recalcSubmit = useSubmit();

  const ouvert = !!enseignant;
  const id = enseignant?.id ?? '';

  const affectations = useResource<AffectationAPI[]>(
    () => ecoleListerAffectationsEnseignant(id) as Promise<AffectationAPI[]>,
    [id],
    ouvert
  );
  const charge = useResource<ChargeAPI>(
    () => ecoleChargeHoraireEnseignant(id) as unknown as Promise<ChargeAPI>,
    [id],
    ouvert
  );
  const edt = useResource(() => ecoleEdtEnseignant(id), [id], ouvert);
  const parcours = useResource(() => ecoleParcoursEnseignant(id), [id], ouvert);

  const activerPortail = () => {
    if (!enseignant) return;
    if (
      !window.confirm(
        `Activer / réinitialiser le portail de ${enseignant.prenom} ${enseignant.nom} ?`
      )
    )
      return;
    portailSubmit.run(async () => {
      const r = await ecoleActiverPortailEnseignant(enseignant.id);
      if (r.mot_de_passe_temporaire) {
        window.alert(
          `Portail activé.\n\nMot de passe temporaire : ${r.mot_de_passe_temporaire}\n\n` +
            `Communiquez-le à l'enseignant — il ne sera plus affiché.`
        );
        setPortailMsg('Portail activé — mot de passe communiqué une seule fois.');
      } else {
        setPortailMsg('Portail réactivé (mot de passe inchangé).');
      }
    });
  };

  const recalculer = () => {
    if (!enseignant) return;
    recalcSubmit.run(async () => {
      await ecoleRecalculerParcoursEnseignant(enseignant.id);
      parcours.reload();
    });
  };

  return (
    <FormDrawer
      open={ouvert}
      onClose={onClose}
      title={enseignant ? `${enseignant.prenom} ${enseignant.nom}` : ''}
      subtitle={enseignant?.email || enseignant?.email_interne || undefined}
      submitLabel="Fermer"
      onSubmit={onClose}
      submitting={false}
      error={null}
    >
      {!enseignant ? null : (
        <>
          {portailMsg && (
            <p className="rounded-win border border-state-successFg/30 bg-win-panel px-3 py-2 text-2xs text-state-successFg">
              {portailMsg}
            </p>
          )}
          {portailSubmit.error && (
            <p className="rounded-win border border-state-dangerFg/30 bg-win-panel px-3 py-2 text-2xs text-state-dangerFg">
              {portailSubmit.error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <StatTile
              label="Affectations actives"
              value={enseignant.nb_affectations_actives ?? 0}
              tone={enseignant.nb_affectations_actives > 0 ? 'success' : 'warning'}
            />
            <StatTile
              label="Charge contractuelle"
              value={
                enseignant.volume_horaire_contractuel
                  ? `${enseignant.volume_horaire_contractuel}h`
                  : '—'
              }
              hint="par semaine"
              tone="neutral"
            />
            <StatTile
              label="Heures réelles"
              value={charge.data ? `${charge.data.total_heures_hebdo_reelles}h` : '—'}
              hint={charge.data?.alerte_charge ? 'Écart détecté' : '—'}
              tone={charge.data?.alerte_charge ? 'warning' : 'accent'}
            />
          </div>

          {charge.data?.alerte_charge && (
            <p className="rounded-win border border-state-warnFg/30 bg-state-warnBg px-3 py-2 text-2xs text-state-warnFg">
              {charge.data.alerte_charge}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              icon={<UserCogIcon size={12} />}
              disabled={portailSubmit.submitting}
              onClick={activerPortail}
            >
              Portail
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<PlusIcon size={12} />}
              onClick={() => setAffecterOuvert(true)}
            >
              Affecter des matières
            </Button>
            <Divider />
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCwIcon size={12} />}
              disabled={recalcSubmit.submitting}
              onClick={recalculer}
            >
              Recalculer parcours
            </Button>
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'affectations', label: 'Affectations', count: (affectations.data ?? []).length },
              { id: 'charge', label: 'Charge horaire' },
              { id: 'edt', label: 'Emploi du temps' },
              { id: 'parcours', label: 'Parcours', count: parcours.data?.nb_annees },
            ]}
          />

          {tab === 'affectations' && (
            <AffectationsTab
              affectations={affectations}
              onReload={() => {
                affectations.reload();
                charge.reload();
              }}
            />
          )}
          {tab === 'charge' && <ChargeTab charge={charge} />}
          {tab === 'edt' && <EdtTab edt={edt} />}
          {tab === 'parcours' && <ParcoursTab parcours={parcours} />}

          <AffecterMatieresDrawer
            open={affecterOuvert}
            enseignantId={enseignant.id}
            enseignantNom={`${enseignant.prenom} ${enseignant.nom}`}
            anneeId={anneeId}
            onClose={() => setAffecterOuvert(false)}
            onSuccess={() => {
              setAffecterOuvert(false);
              affectations.reload();
              charge.reload();
            }}
          />
        </>
      )}
    </FormDrawer>
  );
}

// ─── Onglet Affectations ─────────────────────────────────────────────

function AffectationsTab({
  affectations,
  onReload,
}: {
  affectations: ReturnType<typeof useResource<AffectationAPI[]>>;
  onReload: () => void;
}) {
  const suppression = useSubmit();

  if (affectations.loading) return <LoadingState />;
  if (affectations.error)
    return <ErrorState message={affectations.error} onRetry={affectations.reload} />;

  const rows = affectations.data ?? [];
  if (rows.length === 0) {
    return (
      <p className="rounded-win border border-win-border bg-win-panel px-3 py-3 text-2xs text-win-muted">
        Aucune matière affectée actuellement. Utilisez « Affecter des matières ».
      </p>
    );
  }

  return (
    <>
      {suppression.error && (
        <ErrorState message={suppression.error} onRetry={() => suppression.setError(null)} />
      )}
      <ul className="space-y-1.5">
        {rows.map((a) => (
          <li
            key={a.affectation_id}
            className="rounded-win border border-win-border bg-win-surface px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-win-text">
                  {a.classe_libelle} · <span className="text-win-muted">{a.matiere}</span>
                </p>
                <p className="text-2xs text-win-faint">
                  Coef {a.coefficient} · depuis {a.date_debut}
                  {a.volume_horaire_hebdo ? ` · ${a.volume_horaire_hebdo}h/sem` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge tone={a.statut === 'actif' ? 'success' : 'neutral'}>{a.statut}</Badge>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2Icon size={12} />}
                  disabled={suppression.submitting}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Retirer ${a.matiere} de ${a.classe_libelle} ?\n\n` +
                          `Les créneaux d'emploi du temps existants resteront.`
                      )
                    ) {
                      suppression.run(async () => {
                        await ecoleRetirerAffectation(a.matiere_classe_id, {
                          motif: 'reorganisation',
                        });
                        onReload();
                      });
                    }
                  }}
                >
                  Retirer
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ─── Onglet Charge horaire ───────────────────────────────────────────

function ChargeTab({
  charge,
}: {
  charge: ReturnType<typeof useResource<ChargeAPI>>;
}) {
  if (charge.loading) return <LoadingState />;
  if (charge.error) return <ErrorState message={charge.error} onRetry={charge.reload} />;
  if (!charge.data) return null;

  const c = charge.data;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Classes" value={c.nb_classes} tone="accent" />
        <StatTile label="Matières" value={c.nb_matieres} tone="neutral" />
        <StatTile
          label="Total hebdo"
          value={`${c.total_heures_hebdo_reelles}h`}
          hint={
            c.volume_horaire_contractuel
              ? `Contrat : ${c.volume_horaire_contractuel}h`
              : 'Contrat non défini'
          }
          tone={c.ecart_vs_contrat ? 'warning' : 'success'}
        />
      </div>
      {(c.detail_par_classe ?? []).map((cl) => (
        <div
          key={cl.classe_id}
          className="rounded-win border border-win-border bg-win-surface px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-win-text">{cl.classe_libelle}</span>
            <span className="text-2xs tabular-nums text-win-muted">
              {cl.heures_hebdo}h/sem
            </span>
          </div>
          <ul className="mt-1 space-y-0.5">
            {cl.matieres.map((m, i) => (
              <li key={i} className="flex items-center justify-between text-2xs">
                <span className="text-win-muted">{m.matiere}</span>
                <span className="tabular-nums text-win-faint">
                  coef {m.coefficient} · {m.heures_hebdo}h
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Onglet EDT ──────────────────────────────────────────────────────

function EdtTab({ edt }: { edt: ReturnType<typeof useResource> }) {
  if (edt.loading) return <LoadingState />;
  if (edt.error) return <ErrorState message={edt.error} onRetry={edt.reload} />;
  if (!edt.data) return null;

  const data = edt.data as {
    grille: Record<string, { heure_debut: string; heure_fin: string; matiere: string; classe: string; salle: string | null }[]>;
    total_heures_semaine: number;
  };
  const grille = data.grille ?? {};

  return (
    <div className="space-y-2">
      <div className="rounded-win border border-win-border bg-win-panel px-3 py-2 text-2xs text-win-muted">
        Total :{' '}
        <span className="font-semibold text-win-text">{data.total_heures_semaine}h / semaine</span>
      </div>
      {JOURS.map((label, idx) => {
        const creneaux = grille[String(idx)] ?? [];
        if (creneaux.length === 0) return null;
        return (
          <div
            key={idx}
            className="rounded-win border border-win-border bg-win-surface px-3 py-2"
          >
            <p className="text-2xs font-semibold uppercase tracking-wide text-win-muted">
              {label}
            </p>
            <ul className="mt-1 space-y-1">
              {creneaux.map((c, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 border-l-2 border-win-accent pl-2 text-2xs"
                >
                  <span className="text-win-text">
                    <span className="tabular-nums text-win-muted">
                      {c.heure_debut}–{c.heure_fin}
                    </span>{' '}
                    · {c.matiere}
                  </span>
                  <span className="text-win-faint">
                    {c.classe}
                    {c.salle ? ` · ${c.salle}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {JOURS.every((_, idx) => !(grille[String(idx)] ?? []).length) && (
        <p className="rounded-win border border-win-border bg-win-panel px-3 py-3 text-2xs text-win-muted">
          Aucun créneau planifié.
        </p>
      )}
    </div>
  );
}

// ─── Onglet Parcours ─────────────────────────────────────────────────

function ParcoursTab({ parcours }: { parcours: ReturnType<typeof useResource> }) {
  if (parcours.loading) return <LoadingState />;
  if (parcours.error)
    return <ErrorState message={parcours.error} onRetry={parcours.reload} />;
  if (!parcours.data) return null;

  const data = parcours.data as {
    nb_annees: number;
    annees: {
      annee_scolaire_id: string;
      nb_classes_distinctes: number;
      nb_matieres_enseignees: number;
      nb_eleves_total: number;
      heures_totales_annuelles: number;
      moyenne_eleves_globale: number | null;
      taux_reussite_pct: number | null;
      taux_occupation_pct: number | null;
      score_performance: number | null;
      classes_detaillees: { classe_id: string; classe_libelle: string; matieres: string[]; nb_eleves: number }[];
    }[];
    cumuls_carriere: {
      heures_totales: number;
      nb_annees_enseignement: number;
      nb_eleves_cumules: number;
      nb_classes_distinctes: number;
      moyenne_carriere: number | null;
      tendance: 'hausse' | 'baisse' | 'stable';
    };
  };

  const cumuls = data.cumuls_carriere;
  const annees = data.annees ?? [];

  return (
    <div className="space-y-3">
      {cumuls && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <StatTile
            label="Années d'enseignement"
            value={cumuls.nb_annees_enseignement}
            tone="accent"
          />
          <StatTile
            label="Heures cumulées"
            value={`${Math.round(cumuls.heures_totales)}h`}
            tone="neutral"
          />
          <StatTile label="Élèves cumulés" value={cumuls.nb_eleves_cumules} tone="success" />
          <StatTile
            label="Classes distinctes"
            value={cumuls.nb_classes_distinctes}
            tone="neutral"
          />
          <StatTile
            label="Moyenne carrière"
            value={cumuls.moyenne_carriere != null ? `${cumuls.moyenne_carriere}/20` : '—'}
            tone="warning"
          />
          <StatTile
            label="Tendance"
            value={
              cumuls.tendance === 'hausse'
                ? '↗ Hausse'
                : cumuls.tendance === 'baisse'
                ? '↘ Baisse'
                : '→ Stable'
            }
            tone={
              cumuls.tendance === 'hausse'
                ? 'success'
                : cumuls.tendance === 'baisse'
                ? 'warning'
                : 'neutral'
            }
          />
        </div>
      )}

      {annees.length === 0 ? (
        <p className="rounded-win border border-win-border bg-win-panel px-3 py-3 text-2xs text-win-muted">
          Aucun historique d'enseignement pour le moment.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {annees.map((a) => (
            <li
              key={a.annee_scolaire_id}
              className="rounded-win border border-win-border bg-win-surface px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-win-text">
                  {a.nb_classes_distinctes} classe(s) · {a.nb_matieres_enseignees} matière(s)
                </span>
                <span className="text-2xs text-win-muted">
                  {Math.round(a.heures_totales_annuelles)}h / an
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-win-muted">
                <span>{a.nb_eleves_total} élève(s)</span>
                {a.moyenne_eleves_globale != null && (
                  <span>Moyenne {a.moyenne_eleves_globale}/20</span>
                )}
                {a.taux_reussite_pct != null && <span>Réussite {a.taux_reussite_pct}%</span>}
                {a.taux_occupation_pct != null && (
                  <span>Occupation {a.taux_occupation_pct}%</span>
                )}
                {a.score_performance != null && <span>Score {a.score_performance}/100</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {annees[0]?.classes_detaillees?.length > 0 && (
        <div className="rounded-win border border-win-border bg-win-panel px-3 py-2">
          <p className="text-2xs font-semibold uppercase text-win-muted">
            Classes tenues l'année la plus récente
          </p>
          <ul className="mt-1 space-y-0.5 text-2xs">
            {annees[0].classes_detaillees.map((c) => (
              <li key={c.classe_id} className="flex justify-between">
                <span className="text-win-text">{c.classe_libelle}</span>
                <span className="text-win-faint">
                  {c.matieres.join(', ')} · {c.nb_eleves} élève(s)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Sous-drawer Affecter des matières ───────────────────────────────

function AffecterMatieresDrawer({
  open,
  enseignantId,
  enseignantNom,
  anneeId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  enseignantId: string;
  enseignantNom: string;
  anneeId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Le hook est appelé seulement quand le drawer est monté — pas de fetch inutile
  const ref = useReferentielEcole();
  const [classeId, setClasseId] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [dateDebut, setDateDebut] = useState(aujourdHui());
  const [forcer, setForcer] = useState(false);
  const submit = useSubmit();

  const matieres = useResource(
    () => ecoleListerMatieresClasse(classeId),
    [classeId],
    open && !!classeId
  );

  const dejaAffecteesIds = useMemo(
    () =>
      new Set(
        (matieres.data ?? [])
          .filter((m) => m.enseignant_id)
          .map((m) => m.matiere_classe_id)
      ),
    [matieres.data]
  );

  const toggle = (id: string) =>
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const reset = () => {
    setClasseId('');
    setSelection([]);
    setDateDebut(aujourdHui());
    setForcer(false);
    submit.setError(null);
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Affecter des matières"
      subtitle={enseignantNom}
      submitLabel={`Affecter${selection.length ? ` (${selection.length})` : ''}`}
      submitting={submit.submitting}
      error={submit.error}
      onSubmit={() => {
        if (!anneeId) return submit.setError('Aucune année scolaire active.');
        if (!classeId) return submit.setError('Choisissez une classe.');
        if (selection.length === 0) return submit.setError('Sélectionnez au moins une matière.');
        submit.run(async () => {
          await ecoleAffecterMasse(enseignantId, {
            annee_scolaire_id: anneeId,
            matiere_classe_ids: selection,
            date_debut: dateDebut,
            forcer_remplacement: forcer,
          });
          reset();
          onSuccess();
        });
      }}
    >
      <ComboboxField
        label="Classe"
        required
        value={classeId}
        onChange={(v) => {
          setClasseId(v);
          setSelection([]);
        }}
        loading={ref.classes.loading}
        options={ref.classeOptions}
        placeholder="Choisir une classe…"
        emptyLabel="Aucune classe cette année."
      />

      {classeId && matieres.loading && <LoadingState />}
      {classeId && matieres.error && (
        <ErrorState message={matieres.error} onRetry={matieres.reload} />
      )}

      {classeId && matieres.data && (
        <div className="rounded-win border border-win-border bg-win-surface p-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-win-muted">
            Matières de cette classe
          </p>
          <ul className="space-y-1.5">
            {matieres.data.map((m) => {
              const dejaPrise = dejaAffecteesIds.has(m.matiere_classe_id);
              const disabled = dejaPrise && !forcer;
              return (
                <li
                  key={m.matiere_classe_id}
                  className="flex items-center justify-between gap-2"
                >
                  <CheckboxField
                    label={`${m.matiere} (coef ${m.coefficient})`}
                    checked={selection.includes(m.matiere_classe_id)}
                    onChange={() => !disabled && toggle(m.matiere_classe_id)}
                  />
                  {dejaPrise && <Badge tone="warning">Déjà affectée</Badge>}
                </li>
              );
            })}
            {matieres.data.length === 0 && (
              <li className="text-2xs text-win-muted">
                Aucune matière affectée à cette classe pour l'instant.
              </li>
            )}
          </ul>
        </div>
      )}

      <TextField
        label="Date d'effet"
        type="date"
        required
        value={dateDebut}
        onChange={setDateDebut}
      />

      <CheckboxField
        label="Forcer le remplacement des matières déjà affectées à un autre enseignant"
        checked={forcer}
        onChange={(v) => {
          setForcer(v);
          if (!v) setSelection((prev) => prev.filter((id) => !dejaAffecteesIds.has(id)));
        }}
      />
    </FormDrawer>
  );
}