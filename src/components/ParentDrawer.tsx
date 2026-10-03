import { useState } from 'react';
import {
  CopyIcon, CheckIcon, MailIcon, PhoneIcon, MapPinIcon,
  UsersIcon, AlertTriangleIcon, LinkIcon, XIcon,
} from 'lucide-react';
import { Drawer } from './ui/Drawer';
import { Tabs } from './ui/Tabs';
import { Badge, StatusBadge } from './ui/Badge';
import {
  Avatar, Button, FieldRow, Panel, LoadingState, ErrorState,
  TextField, SelectField,
} from './ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { formatDate, initiales, str } from '../utils/format';
import {
  ecoleGetParent,
  ecoleEnfantsDuParent,
  ecoleLierEnfantAuParent,
} from '../lib/api_ecole';

interface Props {
  parentId: string | null;
  onClose: () => void;
}

export function ParentDrawer({ parentId, onClose }: Props) {
  const [tab, setTab] = useState('identite');
  const open = !!parentId;
  const id = parentId ?? '';
  const [copie, setCopie] = useState(false);
  const [lierOpen, setLierOpen] = useState(false);
  const [lierForm, setLierForm] = useState({ code: '', lien: 'tuteur' });
  const lierSubmit = useSubmit();

  const parent = useResource(() => ecoleGetParent(id), [id], open);
  const enfants = useResource(() => ecoleEnfantsDuParent(id), [id], open);

  if (!parentId) return null;

  const p = parent.data;

  async function copierIdentifiants() {
    if (!p) return;
    const texte = `Identifiant : ${p.telephone}\nNom : ${p.prenom} ${p.nom}`;
    await navigator.clipboard.writeText(texte);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  function soumettreLier() {
    if (!lierForm.code.trim()) return;
    lierSubmit.run(
      async () => {
        await ecoleLierEnfantAuParent(id, {
          code: lierForm.code.trim(),
          lien: lierForm.lien,
        });
      },
      () => {
        setLierOpen(false);
        setLierForm({ code: '', lien: 'tuteur' });
        enfants.reload();
      },
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={p ? `${p.prenom} ${p.nom}` : 'Compte parent'}
      subtitle={p ? p.telephone : id}
      width="w-[560px]"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs text-win-muted">
            Créé par :{' '}
            <span className="font-medium text-win-text">
              {str(p?.cree_par_admin) || '—'}
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              icon={copie ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              onClick={copierIdentifiants}
              disabled={!p}
            >
              {copie ? 'Copié' : 'Copier l’identifiant'}
            </Button>
          </div>
        </div>
      }
    >
      {parent.loading && <LoadingState />}
      {parent.error && <ErrorState message={parent.error} onRetry={parent.reload} />}

      {p && (
        <>
          {/* En-tête profil */}
          <div className="mb-3 flex items-start gap-3 border border-win-border bg-win-surface p-3 shadow-win rounded-win">
            <span className="flex h-12 w-12 items-center justify-center bg-win-accentSoft text-base font-semibold text-win-accent rounded-win">
              {initiales(p.nom, p.prenom)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={p.peut_se_connecter_portail ? 'success' : 'neutral'}>
                  {p.peut_se_connecter_portail ? 'Portail actif' : 'Portail désactivé'}
                </Badge>
                {p.doit_changer_mot_de_passe && (
                  <Badge tone="warning">Mot de passe à changer</Badge>
                )}
                <Badge tone="accent">
                  {enfants.data?.length ?? 0} enfant(s) lié(s)
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
                <div className="flex items-center gap-1 text-win-muted">
                  <PhoneIcon size={11} />
                  <span className="font-mono">{p.telephone}</span>
                </div>
                {p.email && (
                  <div className="flex items-center gap-1 text-win-muted">
                    <MailIcon size={11} />
                    <span className="truncate">{p.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'identite', label: 'Identité' },
              { id: 'coordonnees', label: 'Coordonnées' },
              { id: 'enfants', label: 'Enfants', count: enfants.data?.length },
              { id: 'acces', label: 'Accès portail' },
            ]}
          />

          <div className="mt-3 space-y-3">

            {/* ── Identité ── */}
            {tab === 'identite' && (
              <>
                <Panel title="Informations personnelles">
                  <dl>
                    <FieldRow label="Nom">{str(p.nom)}</FieldRow>
                    <FieldRow label="Prénom">{str(p.prenom)}</FieldRow>
                    <FieldRow label="Profession">{str(p.profession)}</FieldRow>
                  </dl>
                </Panel>
                <Panel title="Métadonnées">
                  <dl>
                    <FieldRow label="Identifiant interne">{p.id}</FieldRow>
                    <FieldRow label="Entreprise">{p.entreprise_id}</FieldRow>
                    {p.created_at && (
                      <FieldRow label="Créé le">{formatDate(p.created_at)}</FieldRow>
                    )}
                  </dl>
                </Panel>
              </>
            )}

            {/* ── Coordonnées ── */}
            {tab === 'coordonnees' && (
              <Panel title="Contacts">
                <dl>
                  <FieldRow label="Téléphone principal">
                    <span className="inline-flex items-center gap-1">
                      <PhoneIcon size={11} className="text-win-faint" />
                      <span className="font-mono">{p.telephone}</span>
                    </span>
                  </FieldRow>
                  <FieldRow label="Téléphone secondaire">
                    {p.telephone_secondaire ? (
                      <span className="inline-flex items-center gap-1">
                        <PhoneIcon size={11} className="text-win-faint" />
                        <span className="font-mono">{p.telephone_secondaire}</span>
                      </span>
                    ) : (
                      <span className="text-win-faint">—</span>
                    )}
                  </FieldRow>
                  <FieldRow label="Email">
                    {p.email ? (
                      <span className="inline-flex items-center gap-1">
                        <MailIcon size={11} className="text-win-faint" />
                        {p.email}
                      </span>
                    ) : (
                      <span className="text-win-faint">—</span>
                    )}
                  </FieldRow>
                  <FieldRow label="Adresse">
                    {p.adresse ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPinIcon size={11} className="text-win-faint" />
                        {p.adresse}
                      </span>
                    ) : (
                      <span className="text-win-faint">—</span>
                    )}
                  </FieldRow>
                </dl>
              </Panel>
            )}

            {/* ── Enfants liés ── */}
            {tab === 'enfants' && (
              <>
                <Panel
                  title="Enfants liés au compte"
                  bodyClassName=""
                  actions={
                    <Button
                      size="sm"
                      icon={<LinkIcon size={12} />}
                      onClick={() => setLierOpen(true)}
                    >
                      Lier un enfant
                    </Button>
                  }
                >
                  {enfants.loading && <LoadingState />}
                  {enfants.error && (
                    <ErrorState message={enfants.error} onRetry={enfants.reload} />
                  )}
                  <ul className="divide-y divide-win-border">
                    {(enfants.data ?? []).map((e) => (
                      <li
                        key={e.eleve_id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <Avatar initiales={e.nom, e.prenom} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-win-text">
                            {e.prenom} {e.nom}
                          </span>
                          <span className="block text-2xs text-win-muted">
                            {e.matricule}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone="neutral">{e.lien}</Badge>
                          <StatusBadge value={e.statut} />
                        </span>
                      </li>
                    ))}
                    {!enfants.loading && (enfants.data ?? []).length === 0 && (
                      <li className="flex flex-col items-center gap-2 px-3 py-6 text-2xs text-win-muted">
                        <UsersIcon size={16} className="text-win-faint" />
                        <span>Aucun enfant lié à ce compte.</span>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<LinkIcon size={12} />}
                          onClick={() => setLierOpen(true)}
                        >
                          Lier un premier enfant
                        </Button>
                      </li>
                    )}
                  </ul>
                </Panel>

                {/* Formulaire de liaison inline */}
                {lierOpen && (
                  <Panel
                    title="Lier un enfant via code d’accès"
                    className="border-win-accent"
                  >
                    <div className="space-y-3">
                      <TextField
                        label="Code d’accès de l’élève"
                        required
                        value={lierForm.code}
                        onChange={(v) => setLierForm({ ...lierForm, code: v })}
                        placeholder="Ex : XXXX-XXXX-XXXX"
                      />
                      <SelectField
                        label="Lien de parenté"
                        value={lierForm.lien}
                        onChange={(v) => setLierForm({ ...lierForm, lien: v })}
                        options={[
                          { value: 'tuteur', label: 'Tuteur' },
                          { value: 'pere', label: 'Père' },
                          { value: 'mere', label: 'Mère' },
                          { value: 'autre', label: 'Autre' },
                        ]}
                      />

                      {lierSubmit.error && (
                        <div className="flex items-start gap-2 border border-win-danger bg-win-dangerSoft p-2 rounded-win">
                          <AlertTriangleIcon size={12} className="mt-0.5 shrink-0 text-win-danger" />
                          <span className="text-2xs text-win-danger">
                            {lierSubmit.error}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          icon={<XIcon size={12} />}
                          onClick={() => {
                            setLierOpen(false);
                            setLierForm({ code: '', lien: 'tuteur' });
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<LinkIcon size={12} />}
                          onClick={soumettreLier}
                          disabled={lierSubmit.submitting || !lierForm.code.trim()}
                        >
                          {lierSubmit.submitting ? 'Liaison…' : 'Lier l’enfant'}
                        </Button>
                      </div>
                    </div>
                  </Panel>
                )}
              </>
            )}

            {/* ── Accès portail ── */}
            {tab === 'acces' && (
              <>
                <Panel title="État du compte">
                  <dl>
                    <FieldRow label="Connexion portail">
                      <Badge tone={p.peut_se_connecter_portail ? 'success' : 'neutral'}>
                        {p.peut_se_connecter_portail ? 'Autorisé' : 'Bloqué'}
                      </Badge>
                    </FieldRow>
                    <FieldRow label="Doit changer le mot de passe">
                      {p.doit_changer_mot_de_passe ? (
                        <Badge tone="warning">Oui</Badge>
                      ) : (
                        <Badge tone="success">Non</Badge>
                      )}
                    </FieldRow>
                    <FieldRow label="Identifiant de connexion">
                      <span className="font-mono">{p.telephone}</span>
                    </FieldRow>
                  </dl>
                </Panel>

                {p.doit_changer_mot_de_passe && (
                  <Panel title="Action requise" className="border-[#E0C58F]">
                    <div className="flex items-start gap-2">
                      <AlertTriangleIcon
                        size={14}
                        className="mt-0.5 shrink-0 text-win-warning"
                      />
                      <p className="text-2xs text-win-muted">
                        Ce parent ne s'est jamais connecté ou utilise encore le mot
                        de passe temporaire fourni à la création du compte. Il devra
                        le changer à sa première connexion.
                      </p>
                    </div>
                  </Panel>
                )}

                <Panel title="Traçabilité">
                  <dl>
                    <FieldRow label="Créé par">
                      {str(p.cree_par_admin) || (
                        <span className="text-win-faint">—</span>
                      )}
                    </FieldRow>
                    {p.created_at && (
                      <FieldRow label="Créé le">{formatDate(p.created_at)}</FieldRow>
                    )}
                  </dl>
                </Panel>
              </>
            )}

          </div>
        </>
      )}
    </Drawer>
  );
}