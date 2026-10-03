import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlusIcon, CheckCircle2Icon, RefreshCcwIcon, ShuffleIcon, TriangleAlertIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { InfoDrawer } from '../components/ui/InfoDrawer';
import { ComboboxField } from '../components/ui/ComboboxField';
import {
  Button,
  CheckboxField,
  Divider,
  ErrorState,
  LoadingState,
  Panel,
  Select,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { useReferentielEcole } from '../hooks/useReferentielEcole';
import { useEnseignants } from '../hooks/useEnseignants';
import { JOURS, aujourdHui, humanize, str } from '../utils/format';
import {
  ecoleBasculerTypeEdt,
  ecoleCreerCreneau,
  ecoleEdtClasseADate,
  ecoleEdtEnseignant,
  ecoleGetEmploiDuTemps,
  ecoleListerMatieresClasse,
  ecoleListerSalles,
  ecoleRemplacerCreneau,
  ecoleVerifierConflitsCreneau } from
'../lib/api_ecole';
import type { ConflitCreneau } from '../lib/api_ecole';

type Creneau = Record<string, unknown>;
interface CreneauLocalise {
  jour: number;
  item: Creneau;
}

const CRENEAU_VIDE = {
  matiere_classe_id: '',
  jour_semaine: '0',
  heure_debut: '08:00',
  heure_fin: '09:00',
  salle: '',
  forcer_malgre_conflits: false
};

export function EmploiDuTemps() {
  const ref = useReferentielEcole();
  const enseignants = useEnseignants();

  const [classeId, setClasseId] = useState('');
  const [dateReference, setDateReference] = useState(aujourdHui());
  const [enseignantId, setEnseignantId] = useState('');
  const [formCreneau, setFormCreneau] = useState(false);
  const [formRemplacer, setFormRemplacer] = useState(false);
  const [creneauOuvert, setCreneauOuvert] = useState<CreneauLocalise | null>(null);

  const [conflits, setConflits] = useState<ConflitCreneau[] | null>(null);
  const [verification, setVerification] = useState(false);

  // Présélectionne la première classe disponible
  useEffect(() => {
    if (!classeId && ref.classeOptions.length) setClasseId(ref.classeOptions[0].value);
  }, [classeId, ref.classeOptions]);

  const edt = useResource(() => ecoleGetEmploiDuTemps(classeId), [classeId], !!classeId);
  const edtDate = useResource(() => ecoleEdtClasseADate(classeId, dateReference), [classeId, dateReference], !!classeId);
  const matieresClasse = useResource(() => ecoleListerMatieresClasse(classeId), [classeId], !!classeId);
  const edtEnseignant = useResource(() => ecoleEdtEnseignant(enseignantId), [enseignantId], !!enseignantId);
  const salles = useResource(() => ecoleListerSalles(), []);

  const creer = useSubmit();
  const remplacer = useSubmit();
  const bascule = useSubmit();

  const [nouveauCreneau, setNouveauCreneau] = useState(CRENEAU_VIDE);
  const [remplacement, setRemplacement] = useState({
    creneau_id: '',
    heure_debut: '',
    heure_fin: '',
    salle: '',
    jour_semaine: '',
    date_effet: aujourdHui(),
    motif: ''
  });

  const classeCourante = ref.classesParId.get(classeId);
  const grille = (edt.data?.grille ?? {}) as Record<string, Creneau[]>;
  const totalCreneaux = Object.values(grille).reduce((acc, arr) => acc + (arr ?? []).length, 0);

  // Jours affichés : lundi → vendredi, plus tout jour renvoyé par le serveur qui contient des créneaux
  const joursAffiches = useMemo(() => {
    const s = new Set([0, 1, 2, 3, 4]);
    Object.entries(grille).forEach(([j, arr]) => (arr ?? []).length && s.add(Number(j)));
    return Array.from(s).sort((a, b) => a - b);
  }, [grille]);

  // Créneaux remplaçables : ceux pour lesquels le serveur renvoie un identifiant
  const creneauxRemplacables: CreneauLocalise[] = useMemo(
    () =>
    Object.entries(grille).flatMap(([j, arr]) =>
    (arr ?? []).filter((c) => typeof c.id === 'string').map((item) => ({ jour: Number(j), item }))
    ),
    [grille]
  );

  const optionsSalles = (salles.data ?? []).
  map((s) => {
    const r = s as Record<string, unknown>;
    const nom = str(r.nom as string);
    return { value: nom, label: nom, hint: r.capacite ? `${r.capacite} places` : undefined };
  }).
  filter((o) => o.value && o.value !== '—');

  const matiereLabel = (id: string) => (matieresClasse.data ?? []).find((m) => m.matiere_classe_id === id)?.matiere ?? '';

  // ── Vérification automatique des conflits pendant la saisie ──
  useEffect(() => {
    if (!formCreneau || !nouveauCreneau.matiere_classe_id || !nouveauCreneau.heure_debut || !nouveauCreneau.heure_fin) {
      setConflits(null);
      return;
    }
    if (nouveauCreneau.heure_fin <= nouveauCreneau.heure_debut) {
      setConflits(null);
      return;
    }
    let annule = false;
    setVerification(true);
    const t = window.setTimeout(() => {
      ecoleVerifierConflitsCreneau({
        matiere_classe_id: nouveauCreneau.matiere_classe_id,
        jour_semaine: Number(nouveauCreneau.jour_semaine),
        heure_debut: nouveauCreneau.heure_debut,
        heure_fin: nouveauCreneau.heure_fin,
        salle: nouveauCreneau.salle || null
      }).
      then((r) => !annule && setConflits(r)).
      catch(() => !annule && setConflits(null)).
      finally(() => !annule && setVerification(false));
    }, 350);
    return () => {
      annule = true;
      window.clearTimeout(t);
    };
  }, [
  formCreneau,
  nouveauCreneau.matiere_classe_id,
  nouveauCreneau.jour_semaine,
  nouveauCreneau.heure_debut,
  nouveauCreneau.heure_fin,
  nouveauCreneau.salle]
  );

  function ouvrirRemplacement(c?: CreneauLocalise) {
    setRemplacement({
      creneau_id: c ? String(c.item.id) : '',
      heure_debut: c ? str(c.item.heure_debut as string) : '',
      heure_fin: c ? str(c.item.heure_fin as string) : '',
      salle: c && c.item.salle ? String(c.item.salle) : '',
      jour_semaine: c ? String(c.jour) : '',
      date_effet: aujourdHui(),
      motif: ''
    });
    remplacer.setError(null);
    setCreneauOuvert(null);
    setFormRemplacer(true);
  }

  const libelleCreneau = (c: CreneauLocalise) =>
  `${JOURS[c.jour]} ${str(c.item.heure_debut as string)}–${str(c.item.heure_fin as string)} · ${str((c.item.matiere ?? '') as string)}`;

  return (
    <>
      <PageHeader
        title="Emploi du temps"
        description="Grilles par classe et par enseignant — les conflits sont vérifiés par le serveur pendant la saisie"
        actions={
        <>
            <Button icon={<ShuffleIcon size={13} />} onClick={() => ouvrirRemplacement()} disabled={!classeId || edt.data?.mode !== 'variable'}>
              Remplacer un créneau
            </Button>
            <Button
            variant="primary"
            icon={<CalendarPlusIcon size={13} />}
            onClick={() => {
              setNouveauCreneau(CRENEAU_VIDE);
              creer.setError(null);
              setFormCreneau(true);
            }}
            disabled={!classeId}>
            
              Nouveau créneau
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Classes de l’année" value={(ref.classes.data ?? []).length} hint={ref.anneeLibelle} tone="accent" />
        <StatTile label="Créneaux de la classe" value={classeId ? totalCreneaux : '—'} hint={classeCourante?.libelle ?? 'Aucune classe'} tone="neutral" />
        <StatTile
          label="Organisation"
          value={edt.data?.mode ? edt.data.mode === 'fixe' ? 'Journée fixe' : 'Par matière' : '—'}
          hint={classeCourante ? ref.niveauAvecCycle(classeCourante.niveau_id) : 'Type d’emploi du temps'}
          tone="success" />
        
        <StatTile
          label="Heures de l’enseignant"
          value={edtEnseignant.data ? `${edtEnseignant.data.total_heures_semaine} h` : '—'}
          hint={enseignantId ? enseignants.nom(enseignantId) : 'Aucun enseignant choisi'}
          tone="warning" />
        
      </div>

      <Toolbar>
        <ComboboxField
          className="w-56"
          label="Classe"
          value={classeId}
          onChange={setClasseId}
          loading={ref.classes.loading}
          emptyLabel="Aucune classe pour cette année."
          options={ref.classeOptions} />
        
        <Divider />
        <TextField label="Date de référence" type="date" value={dateReference} onChange={setDateReference} />
        <Divider />
        <ComboboxField
          className="w-56"
          label="Enseignant"
          allowEmpty
          placeholder="Aucun"
          value={enseignantId}
          onChange={setEnseignantId}
          loading={enseignants.stats.loading}
          emptyLabel="Aucun enseignant référencé pour cette année."
          options={enseignants.options} />
        
        <Divider />
        <Button
          size="sm"
          icon={<RefreshCcwIcon size={12} />}
          onClick={() => {
            edt.reload();
            edtDate.reload();
          }}>
          
          Actualiser
        </Button>
        {classeCourante &&
        <Button
          size="sm"
          disabled={bascule.submitting}
          onClick={() =>
          bascule.run(
            () => ecoleBasculerTypeEdt(classeCourante.id, classeCourante.type_organisation_edt_effectif === 'fixe' ? 'variable' : 'fixe'),
            () => {
              edt.reload();
              ref.classes.reload();
            }
          )
          }>
          
            Passer en {classeCourante.type_organisation_edt_effectif === 'fixe' ? 'organisation par matière' : 'journée fixe'}
          </Button>
        }
      </Toolbar>
      {bascule.error && <p className="mt-2 text-2xs text-state-dangerFg">{bascule.error}</p>}

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Grille hebdomadaire"
          subtitle={classeCourante ? `${classeCourante.libelle} · ${ref.niveauLabel(classeCourante.niveau_id)}` : 'Sélectionnez une classe'}
          bodyClassName="">
          
          {edt.loading && <LoadingState />}
          {edt.error && <ErrorState message={edt.error} onRetry={edt.reload} />}
          {!classeId && <p className="px-3 py-10 text-center text-xs text-win-muted">Aucune classe sélectionnée.</p>}
          {classeId && !edt.loading && !edt.error &&
          <div
            className="grid grid-cols-1 divide-y divide-win-border md:divide-x md:divide-y-0"
            style={{ gridTemplateColumns: `repeat(${joursAffiches.length}, minmax(0, 1fr))` }}>
            
              {joursAffiches.map((jour) => {
              const creneaux = grille[String(jour)] ?? [];
              return (
                <div key={jour} className="min-h-[220px] p-2">
                    <p className="mb-2 text-2xs font-semibold text-win-muted">{JOURS[jour]}</p>
                    <ul className="space-y-1.5">
                      {creneaux.map((item, i) =>
                    <li key={i}>
                          <button
                        type="button"
                        onClick={() => setCreneauOuvert({ jour, item })}
                        className="w-full rounded-win border border-win-border bg-win-panel px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                        
                            <span className="block text-2xs font-semibold tabular-nums text-win-text">
                              {str(item.heure_debut as string)} – {str(item.heure_fin as string)}
                            </span>
                            <span className="block truncate text-2xs text-win-muted">
                              {item.matiere ? String(item.matiere) : item.type === 'journee_complete' ? 'Journée complète' : '—'}
                            </span>
                            {item.salle ? <span className="block truncate text-2xs text-win-faint">{String(item.salle)}</span> : null}
                          </button>
                        </li>
                    )}
                      {creneaux.length === 0 && <li className="text-2xs text-win-faint">Aucun cours</li>}
                    </ul>
                  </div>);

            })}
            </div>
          }
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title="Grille en vigueur à la date" subtitle={new Date(dateReference).toLocaleDateString('fr-FR', { dateStyle: 'long' })} bodyClassName="">
            {edtDate.loading && <LoadingState />}
            <ul className="divide-y divide-win-border">
              {Object.entries(edtDate.data ?? {}).flatMap(([jour, creneaux]) =>
              (creneaux ?? []).map((c, i) =>
              <li key={`${jour}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-win-text">{c.matiere}</span>
                      <span className="block text-2xs tabular-nums text-win-muted">
                        {JOURS[Number(jour)]} · {c.heure_debut} – {c.heure_fin}
                      </span>
                    </span>
                    {c.salle && <Badge tone="neutral">{c.salle}</Badge>}
                  </li>
              )
              )}
              {!edtDate.loading && Object.values(edtDate.data ?? {}).every((a) => !(a ?? []).length) &&
              <li className="px-3 py-4 text-2xs text-win-muted">Aucun créneau en vigueur à cette date.</li>
              }
            </ul>
          </Panel>

          <Panel
            title="Emploi du temps de l’enseignant"
            subtitle={enseignantId ? enseignants.nom(enseignantId) : 'Choisissez un enseignant'}
            bodyClassName="">
            
            {edtEnseignant.loading && <LoadingState />}
            {edtEnseignant.error && <ErrorState message={edtEnseignant.error} onRetry={edtEnseignant.reload} />}
            <ul className="divide-y divide-win-border">
              {Object.entries(edtEnseignant.data?.grille ?? {}).flatMap(([jour, creneaux]) =>
              (creneaux ?? []).map((c, i) =>
              <li key={`${jour}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-win-text">
                        {c.matiere} · {c.classe}
                      </span>
                      <span className="block text-2xs tabular-nums text-win-muted">
                        {JOURS[Number(jour)]} · {c.heure_debut} – {c.heure_fin}
                      </span>
                    </span>
                    {c.salle && <Badge tone="neutral">{c.salle}</Badge>}
                  </li>
              )
              )}
              {!enseignantId &&
              <li className="px-3 py-4 text-2xs text-win-muted">
                  {enseignants.liste.length ?
                'Aucun enseignant sélectionné.' :
                'Aucun enseignant référencé : les enseignants apparaissent après le calcul des statistiques de l’année.'}
                </li>
              }
            </ul>
          </Panel>
        </div>
      </div>

      <InfoDrawer
        open={!!creneauOuvert}
        onClose={() => setCreneauOuvert(null)}
        title={creneauOuvert ? `${JOURS[creneauOuvert.jour]} · ${str(creneauOuvert.item.heure_debut as string)}` : ''}
        subtitle={classeCourante?.libelle}
        fields={
        creneauOuvert ?
        [
        { label: 'Matière', value: creneauOuvert.item.matiere ? String(creneauOuvert.item.matiere) : 'Journée complète' },
        { label: 'Horaire', value: `${str(creneauOuvert.item.heure_debut as string)} – ${str(creneauOuvert.item.heure_fin as string)}` },
        { label: 'Salle', value: creneauOuvert.item.salle ? String(creneauOuvert.item.salle) : 'Non attribuée' }] :

        []
        }
        footer={
        creneauOuvert && typeof creneauOuvert.item.id === 'string' ?
        <div className="flex justify-end">
              <Button variant="primary" size="sm" icon={<ShuffleIcon size={12} />} onClick={() => ouvrirRemplacement(creneauOuvert)}>
                Remplacer ce créneau
              </Button>
            </div> :
        undefined
        } />
      

      <FormDrawer
        open={formCreneau}
        onClose={() => setFormCreneau(false)}
        title="Nouveau créneau"
        subtitle={classeCourante?.libelle}
        submitting={creer.submitting}
        error={creer.error}
        onSubmit={() => {
          if (!nouveauCreneau.matiere_classe_id) return creer.setError('Choisissez une matière.');
          if (nouveauCreneau.heure_fin <= nouveauCreneau.heure_debut) return creer.setError('L’heure de fin doit suivre l’heure de début.');
          if (conflits && conflits.length > 0 && !nouveauCreneau.forcer_malgre_conflits)
          return creer.setError('Des conflits ont été détectés. Modifiez le créneau ou cochez « Forcer malgré les conflits ».');
          creer.run(
            () =>
            ecoleCreerCreneau({
              matiere_classe_id: nouveauCreneau.matiere_classe_id,
              jour_semaine: Number(nouveauCreneau.jour_semaine),
              heure_debut: nouveauCreneau.heure_debut,
              heure_fin: nouveauCreneau.heure_fin,
              salle: nouveauCreneau.salle || null,
              forcer_malgre_conflits: nouveauCreneau.forcer_malgre_conflits
            }),
            () => {
              setFormCreneau(false);
              edt.reload();
              edtDate.reload();
              edtEnseignant.reload();
            }
          );
        }}>
        
        <SelectField
          label="Matière"
          required
          value={nouveauCreneau.matiere_classe_id}
          onChange={(v) => setNouveauCreneau({ ...nouveauCreneau, matiere_classe_id: v })}
          options={[
          {
            value: '',
            label: matieresClasse.loading ?
            'Chargement…' :
            (matieresClasse.data ?? []).length ?
            'Sélectionner une matière…' :
            'Aucune matière affectée à cette classe'
          },
          ...(matieresClasse.data ?? []).map((m) => ({
            value: m.matiere_classe_id,
            label: `${m.matiere} — ${enseignants.nom(m.enseignant_id)} (coef. ${m.coefficient})`
          }))]
          } />
        
        <SelectField
          label="Jour"
          required
          value={nouveauCreneau.jour_semaine}
          onChange={(v) => setNouveauCreneau({ ...nouveauCreneau, jour_semaine: v })}
          options={JOURS.map((j, i) => ({ value: String(i), label: j }))} />
        
        <TextField label="Heure de début" type="time" required value={nouveauCreneau.heure_debut} onChange={(v) => setNouveauCreneau({ ...nouveauCreneau, heure_debut: v })} />
        <TextField label="Heure de fin" type="time" required value={nouveauCreneau.heure_fin} onChange={(v) => setNouveauCreneau({ ...nouveauCreneau, heure_fin: v })} />
        <ComboboxField
          label="Salle"
          allowEmpty
          placeholder="Aucune salle"
          value={nouveauCreneau.salle}
          onChange={(v) => setNouveauCreneau({ ...nouveauCreneau, salle: v })}
          loading={salles.loading}
          emptyLabel="Aucune salle déclarée dans Patrimoine."
          options={optionsSalles} />
        

        {nouveauCreneau.matiere_classe_id &&
        <div className="rounded-win border border-win-border bg-win-panel px-3 py-2" aria-live="polite">
            {verification ?
          <p className="text-2xs text-win-muted">Vérification des conflits…</p> :
          conflits && conflits.length > 0 ?
          <ul className="space-y-1.5">
                {conflits.map((c, i) =>
            <li key={i} className="flex items-start gap-2">
                    <TriangleAlertIcon size={13} className="mt-0.5 shrink-0 text-state-warnFg" />
                    <span className="min-w-0">
                      <StatusBadge value={c.type} label={humanize(c.type)} />
                      <span className="mt-0.5 block text-2xs text-win-muted">{c.message}</span>
                    </span>
                  </li>
            )}
              </ul> :
          conflits ?
          <p className="flex items-center gap-1.5 text-2xs text-state-successFg">
                <CheckCircle2Icon size={12} /> Aucun conflit pour {matiereLabel(nouveauCreneau.matiere_classe_id)}.
              </p> :

          <p className="text-2xs text-win-muted">Renseignez un horaire valide pour vérifier les conflits.</p>
          }
          </div>
        }

        {conflits && conflits.length > 0 &&
        <CheckboxField
          label="Forcer malgré les conflits"
          checked={nouveauCreneau.forcer_malgre_conflits}
          onChange={(v) => setNouveauCreneau({ ...nouveauCreneau, forcer_malgre_conflits: v })} />

        }
      </FormDrawer>

      <FormDrawer
        open={formRemplacer}
        onClose={() => setFormRemplacer(false)}
        title="Remplacer un créneau"
        subtitle="L’ancien créneau est clôturé à la date d’effet"
        submitting={remplacer.submitting}
        error={remplacer.error}
        submitLabel="Remplacer"
        onSubmit={() => {
          if (!remplacement.creneau_id) return remplacer.setError('Choisissez le créneau à remplacer.');
          if (!remplacement.motif.trim()) return remplacer.setError('Le motif est obligatoire.');
          remplacer.run(
            () =>
            ecoleRemplacerCreneau(remplacement.creneau_id, {
              heure_debut: remplacement.heure_debut || null,
              heure_fin: remplacement.heure_fin || null,
              salle: remplacement.salle || null,
              jour_semaine: remplacement.jour_semaine === '' ? null : Number(remplacement.jour_semaine),
              date_effet: remplacement.date_effet,
              motif: remplacement.motif.trim()
            }),
            () => {
              setFormRemplacer(false);
              edt.reload();
              edtDate.reload();
            }
          );
        }}>
        
        {creneauxRemplacables.length === 0 ?
        <p className="rounded-win border border-state-warnFg/30 bg-state-warnBg px-3 py-2 text-2xs text-state-warnFg">
            Aucun créneau remplaçable : le serveur ne fournit pas l’identifiant des créneaux de cette grille.
          </p> :

        <Select
          label="Créneau à remplacer"
          value={remplacement.creneau_id}
          onChange={(v) => {
            const c = creneauxRemplacables.find((x) => String(x.item.id) === v);
            setRemplacement({
              ...remplacement,
              creneau_id: v,
              heure_debut: c ? str(c.item.heure_debut as string) : '',
              heure_fin: c ? str(c.item.heure_fin as string) : '',
              salle: c && c.item.salle ? String(c.item.salle) : '',
              jour_semaine: c ? String(c.jour) : ''
            });
          }}
          options={[
          { value: '', label: 'Sélectionner…' },
          ...creneauxRemplacables.map((c) => ({ value: String(c.item.id), label: libelleCreneau(c) }))]
          } />

        }
        <SelectField
          label="Nouveau jour"
          value={remplacement.jour_semaine}
          onChange={(v) => setRemplacement({ ...remplacement, jour_semaine: v })}
          options={[{ value: '', label: 'Inchangé' }, ...JOURS.map((j, i) => ({ value: String(i), label: j }))]} />
        
        <TextField label="Nouvelle heure de début" type="time" value={remplacement.heure_debut} onChange={(v) => setRemplacement({ ...remplacement, heure_debut: v })} />
        <TextField label="Nouvelle heure de fin" type="time" value={remplacement.heure_fin} onChange={(v) => setRemplacement({ ...remplacement, heure_fin: v })} />
        <ComboboxField
          label="Salle"
          allowEmpty
          placeholder="Aucune salle"
          value={remplacement.salle}
          onChange={(v) => setRemplacement({ ...remplacement, salle: v })}
          options={optionsSalles} />
        
        <TextField label="Date d’effet" type="date" required value={remplacement.date_effet} onChange={(v) => setRemplacement({ ...remplacement, date_effet: v })} />
        <TextField label="Motif" required value={remplacement.motif} onChange={(v) => setRemplacement({ ...remplacement, motif: v })} />
      </FormDrawer>
    </>);

}