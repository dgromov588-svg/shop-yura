import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Lock, User as UserIcon, KeyRound, Crown, HardDrive, Cloud, Terminal } from 'lucide-react'
import { LogoMark } from '../Logo'
import type { Backend, StatusInfo } from '../../lib/backend'
import type { User } from '../../lib/auth'

interface Props {
  backend: Backend
  status: StatusInfo
  onLogin: (u: User) => void
}

const input =
  'w-full pl-11 pr-4 py-3.5 rounded-xl bg-stone-800/80 border border-amber-700/30 text-amber-50 placeholder-amber-200/30 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition'

function Field({ icon: Icon, children }: { icon: typeof Lock; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400 pointer-events-none" />
      {children}
    </div>
  )
}

export function AdminLogin({ backend, status, onLogin }: Props) {
  const setup = status.needsSetup
  const [login, setLogin] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [code, setCode] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (setup && password !== password2) {
      setError('Паролі не збігаються')
      return
    }
    setLoading(true)
    try {
      const u = setup
        ? await backend.setup({ login: login.trim().toLowerCase(), name: name.trim(), password, code: code.trim().toUpperCase() })
        : await backend.login(login.trim().toLowerCase(), password)
      onLogin(u)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-wood flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <a href="#" className="inline-flex items-center gap-2 text-amber-200/70 hover:text-amber-300 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Повернутися на сайт
        </a>

        <div className="bg-stone-950/70 backdrop-blur-xl rounded-3xl border border-amber-700/40 shadow-2xl p-7 sm:p-8 frame-carved">
          <div className="flex justify-center">
            <LogoMark className="w-24 h-24 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]" />
          </div>

          <h1 className="mt-4 font-display text-2xl font-black text-brass text-center">
            {setup ? 'Перше налаштування' : 'Вхід для команди'}
          </h1>
          <p className="mt-2 text-sm text-amber-200/60 text-center">
            {setup
              ? 'Створіть обліковий запис власника. Помічників потім додасте в розділі «Команда».'
              : 'Салон «АнтикварЪ» — власник і помічники'}
          </p>

          <div
            className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
              backend.mode === 'server'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
            }`}
          >
            {backend.mode === 'server' ? <Cloud className="w-4 h-4 shrink-0" /> : <HardDrive className="w-4 h-4 shrink-0" />}
            {backend.mode === 'server'
              ? 'Спільна база на хостингу: власник і помічники бачать ті самі заявки з будь-якого пристрою.'
              : 'Локальний режим: сервер (api.php) недоступний, дані зберігаються лише в цьому браузері.'}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {setup && (
              <>
                {status.setupCodeRequired && (
                  <div>
                    <Field icon={KeyRound}>
                      <input
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Код налаштування (8 символів)"
                        autoCapitalize="characters"
                        autoComplete="one-time-code"
                        className={`${input} font-mono tracking-widest uppercase`}
                      />
                    </Field>
                    <div className="mt-2 rounded-xl bg-stone-900/80 border border-amber-800/40 p-3 text-xs text-amber-100/70 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                        <Terminal className="w-3.5 h-3.5" /> Де взяти код (захист від сторонніх)
                      </div>
                      <div>
                        Termius: <code className="text-amber-300">bash ~/antikvar.sh admin-code</code>
                      </div>
                      <div>
                        або файл <code className="text-amber-300">{status.setupCodePath || '~/antikvar-data/SETUP-CODE.txt'}</code> у файловому менеджері CityHost
                      </div>
                    </div>
                  </div>
                )}
                <Field icon={Crown}>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше імʼя (напр. Юрій)" autoComplete="name" className={input} />
                </Field>
              </>
            )}

            <Field icon={UserIcon}>
              <input
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder={setup ? 'Логін (латиницею, напр. yuriy)' : 'Логін'}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                autoFocus={!setup}
                className={input}
              />
            </Field>

            <Field icon={Lock}>
              <input
                required
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={setup ? 'Пароль (мінімум 8 символів)' : 'Пароль'}
                autoComplete={setup ? 'new-password' : 'current-password'}
                minLength={setup ? 8 : undefined}
                className={`${input} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200/60 hover:text-amber-300"
                aria-label="Показати пароль"
              >
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </Field>

            {setup && (
              <Field icon={Lock}>
                <input
                  required
                  type={showPwd ? 'text' : 'password'}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Повторіть пароль"
                  autoComplete="new-password"
                  className={input}
                />
              </Field>
            )}

            {error && (
              <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brass text-stone-950 font-black shadow-lg shadow-black/40 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? 'Зачекайте…' : setup ? 'Створити власника і увійти' : 'Увійти'}
            </button>
          </form>

          {!setup && (
            <p className="mt-6 pt-5 border-t border-amber-700/20 text-xs text-amber-200/50 text-center leading-relaxed">
              Забули пароль? Помічнику пароль скидає власник у розділі «Команда».
              <br />
              Власник — у Termius: <code className="text-amber-300">bash ~/antikvar.sh reset-password</code>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
