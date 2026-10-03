import { useState } from 'react';
import {
  CopyIcon, CheckIcon, KeyRoundIcon, AlertTriangleIcon, UserPlusIcon,
} from 'lucide-react';
import {
  Button, Divider, TextField, ErrorState,
} from './ui/primitives';
import { FormDrawer } from './ui/FormDrawer';
import { useSubmit } from '../hooks/useResource';
import {
  ecoleCreerCompteParent,
  type CreerCompteParentResult,
} from '../lib/api_ecole';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (r: CreerCompteParentResult) => void;
}

export function CreerCompteParentDrawer({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
  });
  const [resultat, setResultat] = useState<CreerCompteParentResult | null>(null);
  const [copie, setCopie] = useState(false);
  const submit = useSubmit();

  function reset() {
    setForm({ nom: '', prenom: '', telephone: '', email: '' });
    setResultat(null);
    setCopie(false);
  }

  function fermer() {
    reset();
    onClose();
  }

  function soumettre() {
    submit.run(
      async () => {
        const data = await ecoleCreerCompteParent({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          telephone: form.telephone.trim(),
          email: form.email.trim() || null,
        });
        setResultat(data);
        onCreated?.(data);
      },
    );
  }

  async function copier() {
    if (!resultat) return;
    const texte =
      `Identifiant : ${resultat.identifiant_connexion}\n` +
      `Mot de passe temporaire : ${resultat.mot_de_passe_temporaire}`;
    await navigator.clipboard.writeText(texte);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  // ══ Écran 2 : affichage du mot de passe temporaire (une seule fois) ══
  if (resultat) {
    return (
      <FormDrawer
        open={open}
        onClose={fermer}
        title="Compte parent créé"
        subtitle="Ces informations ne seront plus jamais affichées"
        onSubmit={fermer}
        submitLabel="J'ai noté les identifiants"
      >
        <div className="rounded-win border border-win-warning bg-win-warningSoft p-3">
          <div className="flex items-start gap-2">
            <AlertTriangleIcon size={16} className="mt-0.5 shrink-0 text-win-warning" />
            <div className="text-xs text-win-text">
              <p className="font-semibold">À communiquer maintenant</p>
              <p className="mt-1 text-win-faint">
                Ce mot de passe n'est stocké que sous forme de hash.
                Si vous fermez cette fenêtre sans le noter, il faudra recréer le compte.
              </p>
            </div>
          </div>
        </div>

        <Divider />

        <div className="space-y-3">
          <div>
            <div className="text-2xs uppercase tracking-wide text-win-faint">
              Identifiant de connexion
            </div>
            <div className="mt-1 font-mono text-sm text-win-text">
              {resultat.identifiant_connexion}
            </div>
          </div>

          <div>
            <div className="text-2xs uppercase tracking-wide text-win-faint">
              Mot de passe temporaire
            </div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-win border border-win-border bg-win-surface2 px-3 py-2 font-mono text-sm text-win-text">
                {resultat.mot_de_passe_temporaire}
              </code>
              <Button
                size="sm"
                icon={copie ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                onClick={copier}
              >
                {copie ? 'Copié' : 'Copier'}
              </Button>
            </div>
          </div>

          <p className="text-2xs text-win-faint">{resultat.avertissement}</p>
        </div>
      </FormDrawer>
    );
  }

  // ══ Écran 1 : formulaire ══
  return (
    <FormDrawer
      open={open}
      onClose={fermer}
      title="Créer un compte parent"
      subtitle="Génère un identifiant (téléphone) + mot de passe temporaire"
      onSubmit={soumettre}
      submitting={submit.submitting}
      error={submit.error}
      submitLabel="Créer le compte"
    >
      <TextField
        label="Nom"
        required
        value={form.nom}
        onChange={(v) => setForm({ ...form, nom: v })}
      />
      <TextField
        label="Prénom"
        required
        value={form.prenom}
        onChange={(v) => setForm({ ...form, prenom: v })}
      />
      <TextField
        label="Téléphone (identifiant de connexion)"
        required
        value={form.telephone}
        onChange={(v) => setForm({ ...form, telephone: v })}
      />
      <TextField
        label="Email (facultatif)"
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />

      <div className="mt-2 rounded-win border border-win-border bg-win-surface2 p-3">
        <div className="flex items-start gap-2">
          <KeyRoundIcon size={14} className="mt-0.5 shrink-0 text-win-accent" />
          <p className="text-2xs text-win-faint">
            Un mot de passe temporaire sera généré côté serveur et affiché <b>une seule fois</b>.
            Le parent devra le changer à sa première connexion.
          </p>
        </div>
      </div>
    </FormDrawer>
  );
}