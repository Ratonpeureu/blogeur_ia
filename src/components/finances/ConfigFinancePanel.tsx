// components/finances/ConfigFinancePanel.tsx
// Paramètres financiers de l'établissement + politique de pénalités de retard.
import React, { useEffect, useState } from 'react';
import { PercentIcon, SaveIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button, CheckboxField, ErrorState, LoadingState, Panel, SelectField, TextField } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { formatDate, humanize } from '../../utils/format';
import {
  ecoleAppliquerPenalites,
  ecoleDefinirPolitiquePenalite,
  ecoleGetPolitiquePenalite } from
'../../lib/api_ecole';
import type { AppliquerPenalitesResult } from '../../lib/api_ecole';
import { ecoleGetConfigFinance, ecoleOptionsGrille, ecoleSetConfigFinance } from '../../lib/api_ecole_extended';
import type { ConfigurationFinanceEtablissement } from '../../lib/api_ecole_extended';

interface FormConfig {
  mois_debut_annee_financiere: string;
  jour_facturation_mensuelle: string;
  jours_grace_avant_retard: string;
  envoyer_rappel_avant_jours: string;
  autoriser_paiement_partiel: boolean;
  autoriser_paiement_anticipe: boolean;
  appliquer_penalites_retard: boolean;
  generer_recus_automatiquement: boolean;
  compte_bancaire_principal: string;
  operateur_mobile_money: string;
  numero_mobile_money: string;
}

function versForm(c: ConfigurationFinanceEtablissement | null): FormConfig {
  return {
    mois_debut_annee_financiere: c ? String(c.mois_debut_annee_financiere) : '',
    jour_facturation_mensuelle: c ? String(c.jour_facturation_mensuelle) : '',
    jours_grace_avant_retard: c ? String(c.jours_grace_avant_retard) : '',
    envoyer_rappel_avant_jours: c ? String(c.envoyer_rappel_avant_jours) : '',
    autoriser_paiement_partiel: c?.autoriser_paiement_partiel ?? true,
    autoriser_paiement_anticipe: c?.autoriser_paiement_anticipe ?? true,
    appliquer_penalites_retard: c?.appliquer_penalites_retard ?? false,
    generer_recus_automatiquement: c?.generer_recus_automatiquement ?? true,
    compte_bancaire_principal: c?.compte_bancaire_principal ?? '',
    operateur_mobile_money: c?.operateur_mobile_money ?? '',
    numero_mobile_money: c?.numero_mobile_money ?? ''
  };
}

const nombreOuUndefined = (v: string) => v.trim() === '' ? undefined : Number(v);

export function ConfigFinancePanel() {
  const config = useResource(() => ecoleGetConfigFinance(), []);
  const options = useResource(() => ecoleOptionsGrille(), []);
  const politique = useResource(() => ecoleGetPolitiquePenalite(), []);

  const enregistrement = useSubmit();
  const politiqueForm = useSubmit();
  const application = useSubmit();

  const [form, setForm] = useState<FormConfig | null>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [pol, setPol] = useState<{
    active: boolean;
    taux_penalite_pct: string;
    plafond_penalite_pct: string;
    delai_grace_jours: string;
    frequence_application: string;
  } | null>(null);
  const [resultat, setResultat] = useState<AppliquerPenalitesResult | null>(null);

  useEffect(() => {
    if (!config.loading && !config.error && form === null) setForm(versForm(config.data ?? null));
  }, [config.loading, config.error, config.data, form]);

  useEffect(() => {
    if (!politique.loading && !politique.error && pol === null) {
      const p = politique.data;
      setPol({
        active: p?.active ?? false,
        taux_penalite_pct: p ? String(p.taux_penalite_pct) : '',
        plafond_penalite_pct: p ? String(p.plafond_penalite_pct) : '',
        delai_grace_jours: p ? String(p.delai_grace_jours) : '',
        frequence_application: p?.frequence_application ?? 'mensuelle_recurrente'
      });
    }
  }, [politique.loading, politique.error, politique.data, pol]);

  const mois = options.data?.mois ?? [];

  function enregistrer() {
    if (!form) return;
    setEnregistre(false);
    enregistrement.run(
      () =>
      ecoleSetConfigFinance({
        mois_debut_annee_financiere: nombreOuUndefined(form.mois_debut_annee_financiere),
        jour_facturation_mensuelle: nombreOuUndefined(form.jour_facturation_mensuelle),
        jours_grace_avant_retard: nombreOuUndefined(form.jours_grace_avant_retard),
        envoyer_rappel_avant_jours: nombreOuUndefined(form.envoyer_rappel_avant_jours),
        autoriser_paiement_partiel: form.autoriser_paiement_partiel,
        autoriser_paiement_anticipe: form.autoriser_paiement_anticipe,
        appliquer_penalites_retard: form.appliquer_penalites_retard,
        generer_recus_automatiquement: form.generer_recus_automatiquement,
        compte_bancaire_principal: form.compte_bancaire_principal.trim() || null,
        operateur_mobile_money: form.operateur_mobile_money.trim() || null,
        numero_mobile_money: form.numero_mobile_money.trim() || null
      }),
      () => {
        setEnregistre(true);
        config.reload();
      }
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel
        title="Paramètres financiers de l’établissement"
        subtitle={config.data?.updated_at ? `Mis à jour le ${formatDate(config.data.updated_at)}` : 'Valeurs par défaut du serveur'}>
        
        {config.loading && <LoadingState />}
        {config.error && <ErrorState message={config.error} onRetry={config.reload} />}
        {form &&
        <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SelectField
              label="Début de l’année financière"
              value={form.mois_debut_annee_financiere}
              onChange={(v) => setForm({ ...form, mois_debut_annee_financiere: v })}
              options={[{ value: '', label: 'Sélectionner…' }, ...mois.map((m) => ({ value: String(m.value), label: m.label }))]} />
            
              <TextField
              label="Jour de facturation mensuelle"
              type="number"
              value={form.jour_facturation_mensuelle}
              onChange={(v) => setForm({ ...form, jour_facturation_mensuelle: v })} />
            
              <TextField
              label="Jours de grâce avant retard"
              type="number"
              value={form.jours_grace_avant_retard}
              onChange={(v) => setForm({ ...form, jours_grace_avant_retard: v })} />
            
              <TextField
              label="Rappel envoyé (jours avant échéance)"
              type="number"
              value={form.envoyer_rappel_avant_jours}
              onChange={(v) => setForm({ ...form, envoyer_rappel_avant_jours: v })} />
            
              <TextField
              label="Compte bancaire principal"
              value={form.compte_bancaire_principal}
              onChange={(v) => setForm({ ...form, compte_bancaire_principal: v })} />
            
              <TextField
              label="Opérateur Mobile Money"
              value={form.operateur_mobile_money}
              onChange={(v) => setForm({ ...form, operateur_mobile_money: v })} />
            
              <TextField
              label="Numéro Mobile Money"
              value={form.numero_mobile_money}
              onChange={(v) => setForm({ ...form, numero_mobile_money: v })} />
            
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <CheckboxField label="Paiement partiel autorisé" checked={form.autoriser_paiement_partiel} onChange={(v) => setForm({ ...form, autoriser_paiement_partiel: v })} />
              <CheckboxField label="Paiement anticipé autorisé" checked={form.autoriser_paiement_anticipe} onChange={(v) => setForm({ ...form, autoriser_paiement_anticipe: v })} />
              <CheckboxField label="Appliquer les pénalités de retard" checked={form.appliquer_penalites_retard} onChange={(v) => setForm({ ...form, appliquer_penalites_retard: v })} />
              <CheckboxField label="Reçus générés automatiquement" checked={form.generer_recus_automatiquement} onChange={(v) => setForm({ ...form, generer_recus_automatiquement: v })} />
            </div>
            {(config.data?.canaux_notification ?? []).length > 0 &&
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-2xs text-win-muted">Canaux de notification :</span>
                {config.data!.canaux_notification.map((c) =>
            <Badge key={c} tone="neutral">
                    {humanize(c)}
                  </Badge>
            )}
              </div>
          }
            <div className="mt-3 flex items-center justify-end gap-2">
              {enregistrement.error && <p className="text-2xs text-state-dangerFg">{enregistrement.error}</p>}
              {enregistre && !enregistrement.error && <p className="text-2xs text-state-successFg">Paramètres enregistrés.</p>}
              <Button variant="primary" size="sm" icon={<SaveIcon size={12} />} onClick={enregistrer} disabled={enregistrement.submitting}>
                Enregistrer
              </Button>
            </div>
          </>
        }
      </Panel>

      <Panel title="Pénalités de retard" subtitle="Une seule politique par établissement">
        {politique.loading && <LoadingState />}
        {politique.error && <ErrorState message={politique.error} onRetry={politique.reload} />}
        {pol &&
        <>
            <CheckboxField label="Politique active" checked={pol.active} onChange={(v) => setPol({ ...pol, active: v })} />
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <TextField label="Taux de pénalité (%)" type="number" value={pol.taux_penalite_pct} onChange={(v) => setPol({ ...pol, taux_penalite_pct: v })} />
              <TextField label="Plafond (%)" type="number" value={pol.plafond_penalite_pct} onChange={(v) => setPol({ ...pol, plafond_penalite_pct: v })} />
              <TextField label="Délai de grâce (jours)" type="number" value={pol.delai_grace_jours} onChange={(v) => setPol({ ...pol, delai_grace_jours: v })} />
              <SelectField
              label="Fréquence"
              value={pol.frequence_application}
              onChange={(v) => setPol({ ...pol, frequence_application: v })}
              options={[
              { value: 'unique', label: 'Unique' },
              { value: 'mensuelle_recurrente', label: 'Mensuelle récurrente' }]
              } />
            
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button
              size="sm"
              icon={<PercentIcon size={12} />}
              disabled={application.submitting}
              onClick={() =>
              application.run(async () => {
                setResultat(await ecoleAppliquerPenalites());
              })
              }>
              
                Appliquer maintenant
              </Button>
              <Button
              size="sm"
              variant="primary"
              icon={<SaveIcon size={12} />}
              disabled={politiqueForm.submitting}
              onClick={() =>
              politiqueForm.run(
                () =>
                ecoleDefinirPolitiquePenalite({
                  active: pol.active,
                  taux_penalite_pct: Number(pol.taux_penalite_pct) || 0,
                  plafond_penalite_pct: Number(pol.plafond_penalite_pct) || 0,
                  delai_grace_jours: Number(pol.delai_grace_jours) || 0,
                  frequence_application: pol.frequence_application
                }),
                () => politique.reload()
              )
              }>
              
                Enregistrer
              </Button>
            </div>
            {politiqueForm.error && <p className="mt-2 text-2xs text-state-dangerFg">{politiqueForm.error}</p>}
            {application.error && <p className="mt-2 text-2xs text-state-dangerFg">{application.error}</p>}
            {resultat &&
          <p className="mt-2 rounded-win border border-win-border bg-win-panel px-3 py-2 text-2xs text-win-text">
                {resultat.appliquees} pénalité(s) appliquée(s){resultat.motif ? ` — ${resultat.motif}` : ''}.
              </p>
          }
          </>
        }
      </Panel>
    </div>);

}