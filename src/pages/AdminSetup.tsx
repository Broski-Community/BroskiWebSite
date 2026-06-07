import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import PageAnimator from '../components/PageAnimator';

const ADMIN_SETUP_CODE = import.meta.env.VITE_ADMIN_SETUP_CODE || 'broski-admin-2024';

const AdminSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Se non loggato, mostra messaggio
  if (!user || !profile) {
    return (
      <PageAnimator className="relative flex min-h-[calc(100vh-76px)] w-full items-center justify-center overflow-hidden px-4 py-8">
        <div className="relative z-10 w-full max-w-md">
          <div className="overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-8">
            <div className="relative z-10 flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-black bg-error-container shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-3xl text-on-error-container">lock</span>
              </div>
              <h1 className="font-headline-lg text-[36px] uppercase leading-none text-error drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                ACCESSO NEGATO
              </h1>
              <p className="font-body-sm font-bold text-on-surface-variant">
                Devi essere loggato per richiedere privilegi admin.
              </p>
              <button
                onClick={() => navigate('/signin')}
                className="w-full rounded-2xl border-[4px] border-black bg-surface-bright px-6 py-4 font-headline-md text-[18px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                ACCEDI
              </button>
            </div>
          </div>
        </div>
      </PageAnimator>
    );
  }

  // Se già admin, mostra messaggio
  if (profile.role === 'admin') {
    return (
      <PageAnimator className="relative flex min-h-[calc(100vh-76px)] w-full items-center justify-center overflow-hidden px-4 py-8">
        <div className="relative z-10 w-full max-w-md">
          <div className="overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-8">
            <div className="relative z-10 flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-black bg-green-500 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-3xl text-white">verified</span>
              </div>
              <h1 className="font-headline-lg text-[36px] uppercase leading-none text-green-400 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                SEI ADMIN!
              </h1>
              <div className="rounded-3xl border-[3px] border-black bg-surface-container-high p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-body-lg font-bold text-on-surface">
                  Ciao <span className="text-primary-container">{profile.minecraft_username}</span>!
                </p>
                <p className="mt-2 font-body-sm text-on-surface-variant">
                  Hai già privilegi di amministratore. Puoi gestire TierList e News dal pannello admin.
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-2xl border-[4px] border-black bg-surface-bright px-6 py-4 font-headline-md text-[18px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                TORNA ALLA HOME
              </button>
            </div>
          </div>
        </div>
      </PageAnimator>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // for now, no one else can be an admin.
    if (code !== ADMIN_SETUP_CODE || code === ADMIN_SETUP_CODE) {
      setError('Codice admin non valido.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);


    // *
    // ! Zeph, poi qui puoi fare che bisogna approvare la richiesta dal pannello admin?
    // *

    
    setLoading(false);

    if (updateError) {
      setError('Errore durante la promozione. Riprova.');
    } else {
      setSuccess(true);
      // Ricarica pagina dopo 2 secondi per vedere il nuovo stato
      setTimeout(() => window.location.reload(), 2000);
    }
  };

  return (
    <PageAnimator className="relative flex min-h-[calc(100vh-76px)] w-full items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-primary-container/20 blur-3xl"></div>
      <div className="pointer-events-none absolute right-[-10rem] bottom-24 h-80 w-80 rounded-full bg-tertiary/20 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-8">
          <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 2px, transparent 2px)', backgroundSize: '24px 24px', opacity: 0.4 }}></div>
          <div className="absolute -right-14 -top-14 h-44 w-44 rotate-12 rounded-[2rem] border-4 border-black bg-tertiary opacity-80"></div>

          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 -rotate-3 items-center justify-center rounded-3xl border-4 border-black bg-primary-container shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-symbols-outlined text-3xl text-white">admin_panel_settings</span>
            </div>

            <div className="text-center">
              <h1 className="font-headline-lg text-[36px] uppercase leading-none text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:text-[48px]">
                ADMIN ACCESS
              </h1>
              <p className="mt-2 font-body-sm font-bold text-on-surface-variant">
                Inserisci il codice di setup per ottenere privilegi admin
              </p>
            </div>

            <div className="rounded-3xl border-[3px] border-black bg-surface-container-high p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-body-sm text-on-surface-variant">
                Utente: <span className="font-bold text-primary-container">{profile.minecraft_username}</span>
              </p>
            </div>

            {success ? (
              <div className="flex w-full flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-black bg-green-500 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <span className="material-symbols-outlined text-3xl text-white">check_circle</span>
                </div>
                <h2 className="font-headline-md text-[24px] text-green-400">PROMOSSO AD ADMIN!</h2>
                <p className="font-body-sm text-on-surface-variant">Ricaricamento pagina...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">Codice Admin</label>
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="Inserisci codice segreto"
                    className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-on-surface placeholder:text-on-surface-variant/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/40 transition-all"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border-[3px] border-black bg-error-container px-4 py-3 font-body-sm font-bold text-on-error-container shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl border-[4px] border-black bg-tertiary px-6 py-4 font-headline-md text-[18px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'DIVENTA ADMIN'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageAnimator>
  );
};

export default AdminSetup;
