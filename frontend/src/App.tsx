import { useEffect, useState, useRef } from 'react'
import { Select } from '@base-ui/react/select'
import { Switch } from '@base-ui/react/switch'

// ── Types ──────────────────────────────────────────────────────────────────

interface BackendInfo { name: string; models: string[] }
interface StatusData {
  status: string
  models: string[]
  backends: BackendInfo[]
  vision: { enabled: boolean; model?: string; base_url?: string }
  web_search: { enabled: boolean; provider: string }
  web_fetch: { enabled: boolean }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      <div className="section-line" />
    </div>
  )
}

function Pill({ ok, yes = 'Enabled', no = 'Not configured' }: { ok: boolean; yes?: string; no?: string }) {
  return <span className={`pill ${ok ? 'ok' : 'warn'}`}>{ok ? yes : no}</span>
}

function Field({
  label, hint, children, className = ''
}: {
  label: string; hint?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`field ${className}`}>
      <label className="field-label">{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

// ── Select wrapper using Base UI ───────────────────────────────────────────

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  className?: string
}

function SelectField({ label, value, onChange, options, className = '' }: SelectFieldProps) {
  return (
    <Field label={label} className={className}>
      <Select.Root value={value} onValueChange={(v) => onChange(v as string)}>
        <Select.Trigger className="select-trigger">
          <Select.Value />
          <Select.Icon className="select-icon">▾</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="select-positioner" sideOffset={4}>
            <Select.Popup className="select-popup">
              <Select.List className="select-list">
                {options.map((o) => (
                  <Select.Item key={o.value} value={o.value} className="select-item">
                    <Select.ItemIndicator className="select-item-indicator">✓</Select.ItemIndicator>
                    <Select.ItemText>{o.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Field>
  )
}

// ── Switch wrapper using Base UI ───────────────────────────────────────────

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <Switch.Root
        className="switch-root"
        checked={checked}
        onCheckedChange={onChange}
      >
        <Switch.Thumb className="switch-thumb" />
      </Switch.Root>
    </div>
  )
}

// ── Status section ─────────────────────────────────────────────────────────

function StatusSection({ data, offline }: { data: StatusData | null; offline: boolean }) {
  if (offline || !data) {
    return (
      <div className="status-grid">
        <div className="status-card">
          <div className="sc-label">Proxy</div>
          <div><span className="pill err">Offline</span></div>
        </div>
      </div>
    )
  }

  const backends = data.backends.map(b => b.name).join(', ') || '—'

  return (
    <div className="status-grid">
      <div className="status-card">
        <div className="sc-label">Proxy</div>
        <div><Pill ok yes="Running" /></div>
      </div>
      <div className="status-card">
        <div className="sc-label">Backends</div>
        <div className="sc-value">{backends}</div>
        <div className="sc-sub">{data.models.length} model(s)</div>
      </div>
      <div className="status-card">
        <div className="sc-label">Vision</div>
        <div><Pill ok={data.vision.enabled} /></div>
        {data.vision.enabled && <div className="sc-sub">{data.vision.model}</div>}
      </div>
      <div className="status-card">
        <div className="sc-label">Web Search</div>
        <div><Pill ok={data.web_search.enabled} /></div>
        {data.web_search.enabled && <div className="sc-sub">{data.web_search.provider}</div>}
      </div>
      <div className="status-card">
        <div className="sc-label">Web Fetch</div>
        <div><Pill ok yes="Ready" /></div>
      </div>
    </div>
  )
}

// ── .env generator ─────────────────────────────────────────────────────────

interface FormState {
  masterKey: string
  dsKey: string
  dsUrl: string
  dsModels: string
  visUrl: string
  visKey: string
  visModel: string
  searchProvider: string
  searchKey: string
  webSearch: boolean
  webFetch: boolean
  port: string
  logLevel: string
}

const DEFAULTS: FormState = {
  masterKey: '',
  dsKey: '',
  dsUrl: 'https://api.deepseek.com/anthropic',
  dsModels: 'deepseek-chat,deepseek-reasoner',
  visUrl: '',
  visKey: '',
  visModel: '',
  searchProvider: 'tavily',
  searchKey: '',
  webSearch: false,
  webFetch: false,
  port: '8000',
  logLevel: 'INFO',
}

function envLine(key: string, val: string, comment?: string): string {
  if (!val) return `# ${key}=`
  return `${key}=${val}` + (comment ? `  # ${comment}` : '')
}

function buildEnvText(f: FormState): string {
  const isTavily = f.searchProvider === 'tavily'
  return [
    '# Required',
    envLine('MASTER_API_KEY', f.masterKey),
    envLine('DEEPSEEK_API_KEY', f.dsKey),
    `DEEPSEEK_BASE_URL=${f.dsUrl}`,
    `DEEPSEEK_MODELS=${f.dsModels}`,
    '',
    '# Vision (optional)',
    envLine('VISION_BASE_URL', f.visUrl),
    envLine('VISION_API_KEY', f.visKey),
    envLine('VISION_MODEL', f.visModel),
    '',
    '# Web Search (optional)',
    `WEB_SEARCH_PROVIDER=${f.searchProvider}`,
    isTavily
      ? envLine('TAVILY_API_KEY', f.searchKey)
      : envLine('BRAVE_API_KEY', f.searchKey),
    '',
    '# Server',
    `PORT=${f.port}`,
    `LOG_LEVEL=${f.logLevel}`,
  ].join('\n')
}

type EnvToken = { type: 'key' | 'val' | 'comment' | 'plain'; text: string }

function tokenizeLine(line: string): EnvToken[] {
  if (line.startsWith('#')) return [{ type: 'comment', text: line }]
  if (!line.includes('=')) return [{ type: 'plain', text: line }]
  const eqIdx = line.indexOf('=')
  const key = line.slice(0, eqIdx)
  const rest = line.slice(eqIdx + 1)
  const tokens: EnvToken[] = [
    { type: 'key', text: key },
    { type: 'plain', text: '=' },
  ]
  const commentIdx = rest.indexOf('  #')
  if (commentIdx !== -1) {
    tokens.push({ type: 'val', text: rest.slice(0, commentIdx) })
    tokens.push({ type: 'comment', text: rest.slice(commentIdx) })
  } else {
    tokens.push({ type: 'val', text: rest })
  }
  return tokens
}

function EnvPreview({ text }: { text: string }) {
  return (
    <div className="env-block">
      {text.split('\n').map((line, i) => {
        const tokens = tokenizeLine(line)
        return (
          <div key={i}>
            {tokens.map((t, j) => (
              <span key={j} className={t.type === 'plain' ? undefined : `e${t.type[0]}`}>{t.text}</span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ConfigSection() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [generated, setGenerated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const envRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof FormState, val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }))

  const filledClass = (val: string) => val ? 'filled' : ''

  function generate() {
    setGenerated(buildEnvText(form))
    setTimeout(() => envRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function copyEnv() {
    if (!generated) return
    navigator.clipboard.writeText(generated).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const LOG_OPTIONS = ['INFO', 'DEBUG', 'WARNING', 'ERROR'].map(v => ({ label: v, value: v }))
  const PROVIDER_OPTIONS = [
    { label: 'Tavily', value: 'tavily' },
    { label: 'Brave', value: 'brave' },
  ]

  return (
    <>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* DeepSeek */}
        <div className="form-group">
          <div className="form-group-title">DeepSeek Upstream</div>
          <div className="form-grid">
            <Field label="DEEPSEEK_API_KEY" hint="Required. Your DeepSeek API key.">
              <input
                type="password"
                value={form.dsKey}
                onChange={e => set('dsKey', e.target.value)}
                placeholder="sk-…"
                className={filledClass(form.dsKey)}
                autoComplete="off"
              />
            </Field>
            <Field label="DEEPSEEK_BASE_URL" hint="Leave default unless using a mirror.">
              <input
                type="text"
                value={form.dsUrl}
                onChange={e => set('dsUrl', e.target.value)}
                className={filledClass(form.dsUrl)}
              />
            </Field>
            <Field label="DEEPSEEK_MODELS" className="full"
              hint='Comma-separated. Supports aliasing: client-id:upstream-id'>
              <input
                type="text"
                value={form.dsModels}
                onChange={e => set('dsModels', e.target.value)}
                className={filledClass(form.dsModels)}
              />
            </Field>
          </div>
        </div>

        {/* Auth */}
        <div className="form-group">
          <div className="form-group-title">Proxy Auth</div>
          <div className="form-grid">
            <Field label="MASTER_API_KEY" className="full"
              hint="Required. Keys accepted by this proxy. Comma-separated for multiple keys.">
              <input
                type="password"
                value={form.masterKey}
                onChange={e => set('masterKey', e.target.value)}
                placeholder="sk-your-secret"
                className={filledClass(form.masterKey)}
                autoComplete="off"
              />
            </Field>
          </div>
        </div>

        {/* Vision */}
        <div className="form-group">
          <div className="form-group-title">
            Vision Middleware <span className="optional-label">— optional</span>
          </div>
          <div className="form-grid">
            <Field label="VISION_BASE_URL" hint="Any OpenAI-compatible vision endpoint.">
              <input
                type="text"
                value={form.visUrl}
                onChange={e => set('visUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className={filledClass(form.visUrl)}
              />
            </Field>
            <Field label="VISION_API_KEY">
              <input
                type="password"
                value={form.visKey}
                onChange={e => set('visKey', e.target.value)}
                placeholder="sk-…"
                className={filledClass(form.visKey)}
                autoComplete="off"
              />
            </Field>
            <Field label="VISION_MODEL" hint="e.g. gpt-4o-mini, qwen-vl-max, glm-4v">
              <input
                type="text"
                value={form.visModel}
                onChange={e => set('visModel', e.target.value)}
                placeholder="gpt-4o-mini"
                className={filledClass(form.visModel)}
              />
            </Field>
          </div>
        </div>

        {/* Web tools */}
        <div className="form-group">
          <div className="form-group-title">
            Web Tools <span className="optional-label">— optional</span>
          </div>
          <div className="form-grid">
            <SelectField
              label="WEB_SEARCH_PROVIDER"
              value={form.searchProvider}
              onChange={v => set('searchProvider', v)}
              options={PROVIDER_OPTIONS}
            />
            <Field label={form.searchProvider === 'tavily' ? 'TAVILY_API_KEY' : 'BRAVE_API_KEY'}>
              <input
                type="password"
                value={form.searchKey}
                onChange={e => set('searchKey', e.target.value)}
                placeholder={form.searchProvider === 'tavily' ? 'tvly-…' : 'BSA-…'}
                className={filledClass(form.searchKey)}
                autoComplete="off"
              />
            </Field>
          </div>
          <div style={{ paddingTop: 4 }}>
            <SwitchRow label="Enable web_search tool" checked={form.webSearch} onChange={v => set('webSearch', v)} />
            <SwitchRow label="Enable web_fetch tool" checked={form.webFetch} onChange={v => set('webFetch', v)} />
          </div>
        </div>

        {/* Server */}
        <div className="form-group">
          <div className="form-group-title">Server</div>
          <div className="form-grid">
            <Field label="PORT">
              <input type="text" value={form.port} onChange={e => set('port', e.target.value)} />
            </Field>
            <SelectField
              label="LOG_LEVEL"
              value={form.logLevel}
              onChange={v => set('logLevel', v)}
              options={LOG_OPTIONS}
            />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => { setForm(DEFAULTS); setGenerated(null) }}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={generate}>
            Generate .env
          </button>
        </div>
      </div>

      {generated && (
        <div className="section" ref={envRef}>
          <div className="section-header" style={{ alignItems: 'center' }}>
            <span className="section-title">Generated .env</span>
            <div className="section-line" />
            <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copyEnv}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <EnvPreview text={generated} />
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
            Save as <code>.env</code> in the project root, then run:
          </div>
          <div className="run-cmd">
            {'docker build -t deepseek-vision . &&\ndocker run --env-file .env -p 8000:8000 deepseek-vision'}
          </div>
        </div>
      )}
    </>
  )
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [offline, setOffline] = useState(false)
  const [models, setModels] = useState<string[]>([])

  async function poll() {
    try {
      const r = await fetch('/status')
      if (!r.ok) throw new Error()
      const data: StatusData = await r.json()
      setStatus(data)
      setModels(data.models ?? [])
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }

  useEffect(() => {
    poll()
    const id = setInterval(poll, 15_000)
    return () => clearInterval(id)
  }, [])

  const liveClass = offline ? 'err' : status ? 'ok' : ''
  const liveLabel = offline ? 'offline' : status ? 'online' : 'checking…'

  return (
    <div className="layout">
      <header>
        <span className="header-logo">👁</span>
        <span className="header-title">deepseek-vision</span>
        <span className="header-badge">Dashboard</span>
        <div className="header-live">
          <div className={`live-dot ${liveClass}`} />
          <span>{liveLabel}</span>
        </div>
      </header>

      <main>
        <div className="section">
          <SectionHeader title="Service Status" />
          <StatusSection data={status} offline={offline} />
        </div>

        <div className="section">
          <SectionHeader title="Available Models" />
          <div className="card">
            {models.length > 0
              ? <div className="model-list">{models.map(m => <span key={m} className="model-tag">{m}</span>)}</div>
              : <span className="empty-text">No models registered — set DEEPSEEK_API_KEY and restart.</span>
            }
          </div>
        </div>

        <div className="section">
          <SectionHeader title="Configuration" />
          <ConfigSection />
        </div>
      </main>
    </div>
  )
}
