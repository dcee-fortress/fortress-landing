/**
 * Server-side store for Fortress accounts, websites, and tenant metadata.
 * Persists to disk (`server/data/accounts-store.json` or `/tmp/fortress-accounts-store.json`)
 * and warm-instance memory so accounts created on any device survive localStorage/cache clears,
 * can be searched and opened from any device, and can log in with the same email & password.
 */

import fs from 'fs'
import path from 'path'
import {
  DEFAULT_PRIXBURG_METADATA,
  DEFAULT_RODCROFT_METADATA,
  buildDefaultTemplateMetadata,
  cleanSlug,
  subdomainLabelFor,
} from '@/components/fortress/fortressMetadata'

const storePath = () => {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'fortress-accounts-store.json')
  }
  return path.join(process.cwd(), 'data', 'accounts-store.json')
}

export const SEEDED_OWNER_LOGIN = {
  id: 'account-owner',
  email: 'darelchits@gmail.com',
  password: 'Darel2005',
}

export const SEEDED_COMPANY_LOGINS = [
  {
    accountId: 'account-rodcroft',
    siteId: 'site-rodcroft',
    email: 'rodcroft@fortress.com',
    password: 'Rodcroft2026',
    catalogId: 'rodcroft',
    name: 'Rodcroft',
    type: 'Construction',
    systemType: 'construction',
    ceo: 'Mbizvo Rodcroft',
    profilePhoto: '/media/rodcroft/rodcroft-1.jpeg',
    slides: [
      { photo: '/media/rodcroft/rodcroft-1.jpeg', testimonial: 'Rodcroft yard and gate on a working day.' },
      { photo: '/media/rodcroft/rodcroft-2.jpeg', testimonial: 'Structure rising on the Rodcroft site.' },
      { photo: '/media/rodcroft/rodcroft-3.jpeg', testimonial: 'Storeroom stock ready for the next pour.' },
      { photo: '/media/rodcroft/rodcroft-4.jpeg', testimonial: 'Site progress from the deck.' },
      { video: '/media/rodcroft/rodcroft1.mp4', testimonial: 'Rodcroft site reel.' },
    ],
  },
  {
    accountId: 'account-prixburg',
    siteId: 'site-prixburg',
    email: 'prixburg@fortress.com',
    password: 'Prixburg2026',
    catalogId: 'prixburg',
    name: 'Prixburg',
    type: 'Manufacturing',
    systemType: 'manufacturing',
    ceo: 'Tawanda Chitukutuku',
    profilePhoto: '/media/prixburg/prixburg1.jpeg',
    slides: [
      {
        photo: '/media/prixburg/prixburg1.jpeg',
        testimonial:
          'I’m the CEO of this chemical plant. Fortress keeps the floor and the office on one website so production is not chasing paper. Ndatenda. — Tawanda Chitukutuku, CEO',
      },
      {
        photo: '/media/prixburg/prixburg2.jpeg',
        testimonial:
          'Raw materials sit in the storeroom. Fortress calculates consumed stock as batches run, so we always know what left the shelf. — Tawanda Chitukutuku, CEO',
      },
      {
        photo: '/media/prixburg/prixburg3.jpeg',
        testimonial:
          'The system tracks those materials from delivery to mix. Stock is managed by live counts, not a book that is a week behind.',
      },
      {
        photo: '/media/prixburg/prixburg4.jpeg',
        testimonial:
          'Sales dashboards track dishwasher, toilet cleaner, and fabric softener as they leave. The market grew — zvinhu zviri kufamba. — Tawanda Chitukutuku, CEO',
      },
      {
        photo: '/media/prixburg/prixburg5.jpeg',
        testimonial:
          'For a factory like this, the calculating system that keeps formulas intact is the asset. Fortress holds the recipes while output keeps rising. — Tawanda Chitukutuku, CEO',
      },
    ],
  },
  {
    accountId: 'account-siteworks',
    siteId: 'site-siteworks',
    email: 'siteworks@fortress.com',
    password: 'Siteworks2026',
    catalogId: 'siteworks',
    name: 'Siteworks',
    type: 'Construction',
    systemType: 'construction',
    ceo: 'Kudzi Ndlovu',
    profilePhoto: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80',
    slides: [
      {
        photo: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80',
        testimonial: 'Siteworks yard on a cut-and-fill day. — Kudzi Ndlovu, CEO',
      },
    ],
  },
  {
    accountId: 'account-fieldnote',
    siteId: 'site-fieldnote',
    email: 'fieldnote@fortress.com',
    password: 'Fieldnote2026',
    catalogId: 'fieldnote',
    name: 'Fieldnote',
    type: 'Construction',
    systemType: 'construction',
    ceo: 'Tatenda Chirwa',
    profilePhoto: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1400&q=80',
    slides: [
      {
        photo: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1400&q=80',
        testimonial: 'I’m the CEO. From day one the phone is the job trailer. Ndatenda. — Tatenda Chirwa, CEO',
      },
    ],
  },
]

const buildSeededAccounts = () => {
  const owner = {
    id: SEEDED_OWNER_LOGIN.id,
    email: SEEDED_OWNER_LOGIN.email,
    password: SEEDED_OWNER_LOGIN.password,
    websites: [],
    updatedAt: Date.now(),
  }

  const companies = SEEDED_COMPANY_LOGINS.map((login) => {
    const slug = login.catalogId
    return {
      id: login.accountId,
      email: login.email,
      password: login.password,
      updatedAt: Date.now(),
      websites: [
        {
          id: login.siteId,
          name: login.name,
          brandName: login.name,
          type: login.type,
          systemType: login.systemType,
          slug,
          catalogId: slug,
          link: `https://${subdomainLabelFor(slug)}`,
          profilePhoto: login.profilePhoto || '',
          slides: login.slides || [],
          gallery: (login.slides || []).map((s) => s.photo || s.video).filter(Boolean),
          photoCaptions: (login.slides || []).map((s) => s.testimonial || ''),
          ceo: login.ceo || '',
          ceoTestimonial: '',
          testimonial: '',
          seedMediaVersion: 5,
        },
      ],
    }
  })

  return [owner, ...companies]
}

const buildSeededTenants = () => ({
  rodcroft: JSON.parse(JSON.stringify(DEFAULT_RODCROFT_METADATA)),
  prixburg: JSON.parse(JSON.stringify(DEFAULT_PRIXBURG_METADATA)),
  siteworks: buildDefaultTemplateMetadata({
    slug: 'siteworks',
    name: 'Siteworks',
    ceo: 'Kudzi Ndlovu',
    systemType: 'construction',
    emptyData: true,
  }),
  fieldnote: buildDefaultTemplateMetadata({
    slug: 'fieldnote',
    name: 'Fieldnote',
    ceo: 'Tatenda Chirwa',
    systemType: 'construction',
    emptyData: true,
  }),
})

const ensureSeededStore = (rawStore = {}) => {
  const accounts = Array.isArray(rawStore.accounts) ? [...rawStore.accounts] : []
  const tenants = rawStore.tenants && typeof rawStore.tenants === 'object' ? { ...rawStore.tenants } : {}
  const deletedAccountIds = Array.isArray(rawStore.deletedAccountIds) ? [...rawStore.deletedAccountIds] : []
  const deletedSlugs = Array.isArray(rawStore.deletedSlugs) ? [...rawStore.deletedSlugs] : []

  const seededAccounts = buildSeededAccounts()
  seededAccounts.forEach((seeded) => {
    const idx = accounts.findIndex(
      (a) =>
        String(a?.email || '').toLowerCase() === seeded.email.toLowerCase() ||
        a?.id === seeded.id,
    )
    if (idx < 0) {
      accounts.push(seeded)
    } else {
      const existing = accounts[idx]
      const mergedSites = Array.isArray(existing.websites) ? [...existing.websites] : []
      ;(seeded.websites || []).forEach((sSite) => {
        if (
          !mergedSites.some(
            (w) => w.id === sSite.id || w.slug === sSite.slug || w.catalogId === sSite.catalogId,
          )
        ) {
          mergedSites.push(sSite)
        }
      })
      accounts[idx] = {
        ...seeded,
        ...existing,
        id: existing.id || seeded.id,
        email: seeded.email,
        password: existing.password || seeded.password,
        websites: mergedSites,
      }
    }
  })

  const seededTenants = buildSeededTenants()
  Object.entries(seededTenants).forEach(([slug, meta]) => {
    if (!tenants[slug]) {
      tenants[slug] = meta
    }
  })

  return {
    accounts: accounts.filter((a) => a?.email && !deletedAccountIds.includes(a.id)),
    tenants,
    deletedAccountIds,
    deletedSlugs,
    updatedAt: Number(rawStore.updatedAt) || Date.now(),
  }
}

const memoryHolder = () => {
  if (!globalThis.__fortressAccountsStore) {
    globalThis.__fortressAccountsStore = null
  }
  return globalThis.__fortressAccountsStore
}

export const readAccountsStore = () => {
  if (memoryHolder()) {
    return memoryHolder()
  }
  const file = storePath()
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      const hydrated = ensureSeededStore(parsed)
      globalThis.__fortressAccountsStore = hydrated
      return hydrated
    }
  } catch {
    /* fallback to seeded */
  }
  const initial = ensureSeededStore({})
  globalThis.__fortressAccountsStore = initial
  try {
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(initial, null, 2), 'utf8')
  } catch {
    /* ignore write error on read-only fs */
  }
  return initial
}

export const writeAccountsStore = (nextStore) => {
  const normalized = ensureSeededStore({
    ...nextStore,
    updatedAt: Date.now(),
  })
  globalThis.__fortressAccountsStore = normalized
  try {
    const file = storePath()
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(normalized, null, 2), 'utf8')
  } catch {
    /* memory still holds the store */
  }
  return normalized
}

export const mergeIncomingAccounts = (incomingAccounts = [], incomingTenants = {}, options = {}) => {
  const current = readAccountsStore()
  const deletedAccountIds = new Set([
    ...(current.deletedAccountIds || []),
    ...(Array.isArray(options.deletedAccountIds) ? options.deletedAccountIds : []),
  ])
  const deletedSlugs = new Set([
    ...(current.deletedSlugs || []),
    ...(Array.isArray(options.deletedSlugs) ? options.deletedSlugs : []),
  ])

  const byEmail = new Map()
  ;(current.accounts || []).forEach((acc) => {
    const key = String(acc?.email || '').trim().toLowerCase()
    if (!key || deletedAccountIds.has(acc.id)) return
    byEmail.set(key, acc)
  })

  ;(Array.isArray(incomingAccounts) ? incomingAccounts : []).forEach((inc) => {
    const emailKey = String(inc?.email || '').trim().toLowerCase()
    if (!emailKey || deletedAccountIds.has(inc?.id)) return
    const existing = byEmail.get(emailKey)
    if (!existing) {
      const sites = (Array.isArray(inc.websites) ? inc.websites : []).filter(
        (s) => !deletedSlugs.has(cleanSlug(s?.slug || s?.catalogId || s?.name || '')),
      )
      byEmail.set(emailKey, {
        ...inc,
        email: String(inc.email).trim(),
        password: String(inc.password || ''),
        websites: sites,
        updatedAt: Date.now(),
      })
      return
    }

    // Merge websites by id or slug
    const siteMap = new Map()
    ;(existing.websites || []).forEach((s) => {
      const sSlug = cleanSlug(s?.slug || s?.catalogId || s?.name || '')
      if (deletedSlugs.has(sSlug)) return
      siteMap.set(s.id || sSlug, s)
    })
    ;(inc.websites || []).forEach((s) => {
      const sSlug = cleanSlug(s?.slug || s?.catalogId || s?.name || '')
      if (deletedSlugs.has(sSlug)) return
      const key = s.id || sSlug
      const prevSite = siteMap.get(key) || [...siteMap.values()].find((x) => cleanSlug(x?.slug || x?.name) === sSlug)
      if (!prevSite) {
        siteMap.set(key, s)
      } else {
        const mergedSlides =
          Array.isArray(s.slides) && s.slides.length >= (prevSite.slides?.length || 0)
            ? s.slides
            : prevSite.slides || []
        const mergedGallery =
          Array.isArray(s.gallery) && s.gallery.length >= (prevSite.gallery?.length || 0)
            ? s.gallery
            : prevSite.gallery || []
        siteMap.set(prevSite.id || key, {
          ...prevSite,
          ...s,
          name: s.name || prevSite.name,
          ceo: s.ceo !== undefined && s.ceo !== '' ? s.ceo : prevSite.ceo || '',
          profilePhoto: s.profilePhoto || prevSite.profilePhoto || '',
          slides: mergedSlides,
          gallery: mergedGallery,
        })
      }
    })

    byEmail.set(emailKey, {
      ...existing,
      ...inc,
      id: existing.id || inc.id,
      email: existing.email || inc.email,
      password: inc.password || existing.password,
      websites: [...siteMap.values()],
      updatedAt: Date.now(),
    })
  })

  const mergedTenants = { ...(current.tenants || {}) }
  if (incomingTenants && typeof incomingTenants === 'object') {
    Object.entries(incomingTenants).forEach(([rawKey, val]) => {
      const slug = cleanSlug(rawKey)
      if (!slug || deletedSlugs.has(slug) || !val || typeof val !== 'object') return
      mergedTenants[slug] = {
        ...(mergedTenants[slug] || {}),
        ...val,
        slug,
        subdomain: subdomainLabelFor(slug),
      }
    })
  }

  // Ensure every website on every account also has a tenant metadata entry
  ;[...byEmail.values()].forEach((acc) => {
    ;(acc.websites || []).forEach((site) => {
      const slug = cleanSlug(site?.slug || site?.catalogId || site?.name || '')
      if (!slug || deletedSlugs.has(slug)) return
      if (!mergedTenants[slug]) {
        mergedTenants[slug] = buildDefaultTemplateMetadata({
          slug,
          name: site.name || slug,
          ceo: site.ceo || '',
          systemType: site.systemType || 'construction',
          emptyData: slug !== 'rodcroft' && slug !== 'prixburg',
        })
      } else if (site.name || site.ceo) {
        mergedTenants[slug] = {
          ...mergedTenants[slug],
          companyName: site.name || mergedTenants[slug].companyName,
          brandName: site.brandName || site.name || mergedTenants[slug].brandName,
          ceo: site.ceo || mergedTenants[slug].ceo,
        }
      }
    })
  })

  return writeAccountsStore({
    accounts: [...byEmail.values()],
    tenants: mergedTenants,
    deletedAccountIds: [...deletedAccountIds],
    deletedSlugs: [...deletedSlugs],
  })
}

export const searchServerAccounts = (query = '') => {
  const store = readAccountsStore()
  const needle = String(query || '').trim().toLowerCase()
  const results = []

  ;(store.accounts || []).forEach((account) => {
    const email = String(account.email || '')
    const emailUser = email.split('@')[0] || ''
    const sites = Array.isArray(account.websites) && account.websites.length
      ? account.websites
      : [
          {
            id: `acct-card-${account.id}`,
            name: account.companyName || emailUser || email,
            type: 'Account on Fortress',
            systemType: '',
            slug: cleanSlug(emailUser || account.id),
            ceo: account.ceo || '',
            slides: [],
            gallery: [],
          },
        ]

    sites.forEach((site) => {
      const hay = [
        email,
        emailUser,
        site.name,
        site.brandName,
        site.ceo,
        site.type,
        site.systemType,
        site.slug,
        ...(site.slides || []).map((s) => s.testimonial || ''),
      ]
        .join(' ')
        .toLowerCase()
      if (!needle || hay.includes(needle)) {
        results.push({
          accountId: account.id,
          email: account.email,
          site,
        })
      }
    })
  })

  return results
}

const cors = (res) => {
  res.setHeader?.('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type')
}

const bodyOf = (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return {}
}

const queryOf = (req) => {
  if (req.query && typeof req.query === 'object') return req.query
  try {
    const url = new URL(req.url || '', 'http://localhost')
    return Object.fromEntries(url.searchParams.entries())
  } catch {
    return {}
  }
}

export const handleAccountsRequest = (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end?.()
    return
  }

  const query = queryOf(req)

  if (req.method === 'GET') {
    const store = readAccountsStore()
    if (query.q !== undefined) {
      const matches = searchServerAccounts(query.q)
      res.status(200).json({
        ok: true,
        matches,
        accounts: store.accounts,
        tenants: store.tenants,
        updatedAt: store.updatedAt,
      })
      return
    }
    if (query.tenant) {
      const slug = cleanSlug(query.tenant)
      res.status(200).json({
        ok: true,
        tenant: store.tenants?.[slug] || null,
        updatedAt: store.updatedAt,
      })
      return
    }
    res.status(200).json({
      ok: true,
      accounts: store.accounts,
      tenants: store.tenants,
      deletedAccountIds: store.deletedAccountIds || [],
      deletedSlugs: store.deletedSlugs || [],
      updatedAt: store.updatedAt,
    })
    return
  }

  const body = bodyOf(req)

  if (req.method === 'POST' || req.method === 'PUT') {
    if (body.action === 'login') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const store = readAccountsStore()
      const found = (store.accounts || []).find(
        (acc) => String(acc.email || '').trim().toLowerCase() === email && acc.password === password,
      )
      if (!found) {
        res.status(401).json({ ok: false, error: 'That email or password does not match an account.' })
        return
      }
      res.status(200).json({
        ok: true,
        account: found,
        accounts: store.accounts,
        tenants: store.tenants,
      })
      return
    }

    if (body.action === 'delete-account' && body.accountId) {
      const store = readAccountsStore()
      const next = writeAccountsStore({
        ...store,
        accounts: (store.accounts || []).filter((a) => a.id !== body.accountId),
        deletedAccountIds: [...new Set([...(store.deletedAccountIds || []), body.accountId])],
      })
      res.status(200).json({ ok: true, accounts: next.accounts, tenants: next.tenants })
      return
    }

    if (body.action === 'delete-site' && body.slug) {
      const slug = cleanSlug(body.slug)
      const store = readAccountsStore()
      const nextTenants = { ...(store.tenants || {}) }
      delete nextTenants[slug]
      const nextAccounts = (store.accounts || []).map((acc) => ({
        ...acc,
        websites: (acc.websites || []).filter(
          (w) => cleanSlug(w?.slug || w?.catalogId || w?.name || '') !== slug,
        ),
      }))
      const next = writeAccountsStore({
        ...store,
        accounts: nextAccounts,
        tenants: nextTenants,
        deletedSlugs: [...new Set([...(store.deletedSlugs || []), slug])],
      })
      res.status(200).json({ ok: true, accounts: next.accounts, tenants: next.tenants })
      return
    }

    if (body.action === 'save-prixburg-db' && body.tenant && body.data) {
      const slug = cleanSlug(body.tenant)
      const store = readAccountsStore()
      const prevTenant = store.tenants?.[slug] || buildDefaultTemplateMetadata({ slug, name: slug, systemType: 'manufacturing', emptyData: slug !== 'prixburg' })
      const nextTenants = {
        ...(store.tenants || {}),
        [slug]: {
          ...prevTenant,
          prixburgDb: {
            ...(prevTenant.prixburgDb || {}),
            ...body.data,
          },
          updatedAt: Date.now(),
        },
      }
      const next = writeAccountsStore({
        ...store,
        tenants: nextTenants,
      })
      res.status(200).json({ ok: true, tenant: next.tenants[slug] })
      return
    }

    const incomingAccounts = Array.isArray(body.accounts)
      ? body.accounts
      : body.account
        ? [body.account]
        : []
    const incomingTenants =
      body.tenants && typeof body.tenants === 'object'
        ? body.tenants
        : body.tenant && body.tenantSlug
          ? { [cleanSlug(body.tenantSlug)]: body.tenant }
          : {}

    const next = mergeIncomingAccounts(incomingAccounts, incomingTenants, {
      deletedAccountIds: body.deletedAccountIds,
      deletedSlugs: body.deletedSlugs,
    })

    res.status(200).json({
      ok: true,
      accounts: next.accounts,
      tenants: next.tenants,
      deletedAccountIds: next.deletedAccountIds,
      deletedSlugs: next.deletedSlugs,
      updatedAt: next.updatedAt,
    })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export const runAccountsRequest = ({ method = 'GET', query = {}, body = {} } = {}) => {
  let statusCode = 200
  let payload = null
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code
      return this
    },
    json(data) {
      payload = data
      return this
    },
    end() {},
  }
  Object.defineProperty(res, 'statusCode', {
    get() {
      return statusCode
    },
    set(value) {
      statusCode = value
    },
  })
  handleAccountsRequest({ method, query, body }, res)
  return { status: statusCode, json: payload || {} }
}
