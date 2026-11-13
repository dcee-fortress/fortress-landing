import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { NETWORK_ACTIONS, offlineActionMessage, readOnline } from './offline'
import { storage } from './storage'
import {
  fetchLiveFeed,
  loadLiveFeedCache,
  publishLiveUpload,
} from './liveFeed'
import {
  drawingNatureKey,
  extractSteelSchedule,
  findNaturePriceMemory,
  formatDrawingScript,
  jobTypeFromDrawingType,
  loadMasterTemplate,
  mergeScheduleWithExtraction,
  normalizeGateDesign,
  normalizeGateType,
  projectToExtraction,
  rememberNaturePrices,
  updateMasterFromExtraction,
} from './steelVision'
import { RC_COLUMN_DEFAULT_RATES, rcColumnQuote, refreshRcSteelRow, unitWeightForSize } from './rcColumnFormula'
import DrawingChatSession from './DrawingChatSession'
import GateChatSession from './GateChatSession'
import PlanChatSession from './PlanChatSession'
import RodcroftTemplate from './RodcroftTemplate'
import PrixburgTemplate from './PrixburgTemplate'
import CeoProjectsOverview from './CeoProjectsOverview'
import {
  buildDefaultTemplateMetadata,
  cleanSlug,
  detectActiveSubdomain,
  getSiteCeoMetadata,
  RODCROFT_CHADCOMBE_PROJECT_ID,
  saveSiteCeoMetadata,
  subdomainLabelFor,
  subdomainUrlFor,
} from './fortressMetadata'
import {
  BURGLAR_TYPES,
  emptyBurglarDraft,
  emptyPalisadeDraft,
  PALISADE_DEFAULTS,
  BURGLAR_DEFAULTS,
} from './planSession'
import { DEFAULT_BOQ_PERCENTS } from './drawingSession'

const STORE_KEY = 'fortress-phone-app-phase1'
const SESSION_KEY = 'fortress-session-phase1'
/** Bump when demo catalog media must overwrite stale localStorage slides/gallery. */
const CATALOG_MEDIA_SEED = 5
const OWNER_LOGIN = {
  email: 'darelchits@gmail.com',
  password: 'Darel2005',
}
const COMPANY_LOGINS = [
  {
    accountId: 'account-rodcroft',
    siteId: 'site-rodcroft',
    email: 'rodcroft@fortress.com',
    password: 'Rodcroft2026',
    catalogId: 'rodcroft',
  },
  {
    accountId: 'account-prixburg',
    siteId: 'site-prixburg',
    email: 'prixburg@fortress.com',
    password: 'Prixburg2026',
    catalogId: 'prixburg',
  },
  {
    accountId: 'account-siteworks',
    siteId: 'site-siteworks',
    email: 'siteworks@fortress.com',
    password: 'Siteworks2026',
    catalogId: 'siteworks',
  },
  {
    accountId: 'account-fieldnote',
    siteId: 'site-fieldnote',
    email: 'fieldnote@fortress.com',
    password: 'Fieldnote2026',
    catalogId: 'fieldnote',
  },
  {
    accountId: 'account-ancel',
    siteId: 'site-ancel',
    email: 'ancel@fortress.com',
    password: 'Ancel2026',
    catalogId: 'ancel',
  },
]

const COMPANY_LIVE_SITES = {
  rodcroft: {
    home: 'https://rodcroft.fortress.vercel.app/',
    ceo: 'https://rodcroft.fortress.vercel.app/project/p-1789313935790/dashboard/ceo-dashboards',
    label: 'rodcroft.fortress.vercel.app',
  },
  prixburg: {
    home: 'https://prixburg.vercel.app/',
    ceo: 'https://prixburg.vercel.app/',
    ceoNet: 'https://prixburg.vercel.app/',
    ceoGross: 'https://prixburg.vercel.app/',
    label: 'prixburg.vercel.app',
  },
}

const companyLiveSite = (site) => {
  const key = String(site?.catalogId || site?.slug || site?.id || '')
    .toLowerCase()
    .replace(/^site-/, '')
  if (COMPANY_LIVE_SITES[key]) return COMPANY_LIVE_SITES[key]
  if (!key) return null
  const label = subdomainLabelFor(key)
  const home = label.startsWith('/') ? label : `https://${label}/`
  return {
    home,
    ceo: home,
    label: label.replace(/^https?:\/\//, ''),
  }
}
const PHASE1_COMPLETE = true
const PHASE1_ECOCASH_NOTE = 'Phase 2 will be unlocked for exclusive CEOs soon.'
const isOwnerEmail = (email) => String(email || '').trim().toLowerCase() === OWNER_LOGIN.email.toLowerCase()
const SHELVES = ['Best selling', 'Trending', 'New companies']

const BEST_SELLING_PLANS = [
  { id: 'week', label: '$1 a week', note: 'on exclusive trending', price: 1 },
  { id: 'month', label: '$3.50 a month', note: '', price: 3.5 },
  { id: 'year', label: '$22 a year', note: '', price: 22 },
]

const bestSellingPlanLabel = (planId) => {
  const plan = BEST_SELLING_PLANS.find((entry) => entry.id === planId)
  if (!plan) return ''
  return plan.note ? `${plan.label} ${plan.note}` : plan.label
}

const shot = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`
const pexel = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`

const COMMENTS_KEY = 'fortress-comments-v5'
const VIDEO_SECONDS = 10

const REEL = {
  mill: 'https://videos.pexels.com/video-files/2795405/2795405-hd_1920_1080_25fps.mp4',
  weld: 'https://videos.pexels.com/video-files/4483138/4483138-hd_1920_1080_25fps.mp4',
  crane: 'https://videos.pexels.com/video-files/3994446/3994446-uhd_2560_1440_25fps.mp4',
  factory: 'https://videos.pexels.com/video-files/7578544/7578544-hd_1920_1080_30fps.mp4',
}

const MEDIA = {
  rodcroft1: '/media/rodcroft/rodcroft1.mp4',
  rodcroftPhoto1: '/media/rodcroft/rodcroft-1.jpeg',
  rodcroftPhoto2: '/media/rodcroft/rodcroft-2.jpeg',
  rodcroftPhoto3: '/media/rodcroft/rodcroft-3.jpeg',
  rodcroftPhoto4: '/media/rodcroft/rodcroft-4.jpeg',
  prixburg1: '/media/prixburg/prixburg1.jpeg',
  prixburg2: '/media/prixburg/prixburg2.jpeg',
  prixburg3: '/media/prixburg/prixburg3.jpeg',
  prixburg4: '/media/prixburg/prixburg4.jpeg',
  prixburg5: '/media/prixburg/prixburg5.jpeg',
}

const catalog = [
  {
    id: 'rodcroft',
    name: 'Rodcroft',
    category: 'Construction',
    shelf: 'Best selling',
    rating: 4.9,
    hue: '#9a3412',
    showOnGrid: true,
    nativeFrame: true,
    featurePhotos: true,
    featurePhotoCount: 2,
    video: MEDIA.rodcroft1,
    videoCaption: 'Rodcroft site reel.',
    location: 'Zimbabwe',
    ceo: '',
    about: '',
    ceoTestimonial: '',
    slides: [
      {
        photo: MEDIA.rodcroftPhoto1,
        testimonial: 'Rodcroft yard and gate on a working day.',
      },
      {
        photo: MEDIA.rodcroftPhoto2,
        testimonial: 'Structure rising on the Rodcroft site.',
      },
      {
        photo: MEDIA.rodcroftPhoto3,
        testimonial: 'Storeroom stock ready for the next pour.',
      },
      {
        photo: MEDIA.rodcroftPhoto4,
        testimonial: 'Site progress from the deck.',
      },
      {
        video: MEDIA.rodcroft1,
        testimonial: 'Rodcroft site reel.',
      },
    ],
  },
  {
    id: 'prixburg',
    name: 'Prixburg',
    category: 'Manufacturing',
    shelf: 'Best selling',
    rating: 4.9,
    hue: '#1f4d45',
    showOnGrid: true,
    nativeFrame: true,
    featurePhotos: true,
    featurePhotoCount: 2,
    location: 'Zimbabwe',
    ceo: 'Tawanda Chitukutuku',
    about:
      'Prixburg is a chemical manufacturing factory. Fortress tracks storeroom materials, consumed stock, and sales of dishwasher, toilet cleaner, and fabric softener.',
    slides: [
      {
        photo: MEDIA.prixburg1,
        testimonial:
          'I’m the CEO of this chemical plant. Fortress keeps the floor and the office on one website so production is not chasing paper. Ndatenda. — Tawanda Chitukutuku, CEO',
      },
      {
        photo: MEDIA.prixburg2,
        testimonial:
          'Raw materials sit in the storeroom. Fortress calculates consumed stock as batches run, so we always know what left the shelf. — Tawanda Chitukutuku, CEO',
      },
      {
        photo: MEDIA.prixburg3,
        testimonial:
          'The system tracks those materials from delivery to mix. Stock is managed by live counts, not a book that is a week behind.',
      },
      {
        photo: MEDIA.prixburg4,
        testimonial:
          'Sales dashboards track dishwasher, toilet cleaner, and fabric softener as they leave. The market grew — zvinhu zviri kufamba. — Tawanda Chitukutuku, CEO',
      },
      {
        photo: MEDIA.prixburg5,
        testimonial:
          'For a factory like this, the calculating system that keeps formulas intact is the asset. Fortress holds the recipes while output keeps rising. — Tawanda Chitukutuku, CEO',
      },
    ],
  },
  {
    id: 'ancel',
    name: 'Ancel',
    category: 'Fabrication',
    systemType: 'fabrication',
    shelf: 'Best selling',
    rating: 4.9,
    hue: '#3f3f46',
    showOnGrid: true,
    location: 'Zimbabwe',
    ceo: '',
    about: 'Ancel is a fabrication workshop. Recent projects open from the CEO page, and View My Website runs the Zantac template the workshop uses.',
    slides: [
      {
        photo: pexel(277572),
        testimonial: 'Ancel quotes gates from the same website the workshop opens.',
      },
      {
        photo: pexel(206172),
        testimonial: 'Saved projects stay on the phone so a quote can be opened again.',
      },
      {
        photo: pexel(1115804),
        testimonial: 'Width, height, and design rate turn into the quotation the customer sees.',
      },
    ],
  },
  {
    id: 'apex',
    name: 'PaChikonaz Pvt',
    category: 'Manufacturing',
    shelf: 'Best selling',
    rating: 4.9,
    hue: '#1f4d45',
    showOnGrid: true,
    featurePhotos: true,
    featurePhotoCount: 2,
    video: REEL.mill,
    videoCaption: 'Mill-floor reel from the current run.',
    location: 'Zimbabwe',
    ceo: 'Nyasha Mutasa',
    about: 'PaChikonaz Pvt uses Fortress to track mill stock, consumed steel, and sales from the same dashboard.',
    slides: [
      {
        photo: shot('photo-1504917595217-d4dc5ebe6122'),
        testimonial:
          'I’m the mill CEO. Fortress cut paperwork for the engineers so beams and heat numbers live pano on one website. Ndatenda. — Nyasha Mutasa, CEO',
      },
      {
        photo: shot('photo-1565043589221-1a6fd9ae45c7'),
        testimonial:
          'Raw steel sits in the storeroom. Fortress calculates consumed stock as I-beams and plate leave the rack. Zvakanaka — shortages show before a bay runs dry. — Nyasha Mutasa, CEO',
      },
      {
        photo: pexel(3912981),
        testimonial:
          'The system tracks those materials from delivery to mill. Stock is managed pano by live counts, not a book that is a week behind. Ndatenda. — Nyasha Mutasa, CEO',
      },
      {
        photo: shot('photo-1504328345606-18bbc8c9d7d1'),
        testimonial:
          'Sales dashboards update as steel leaves the plant. Ndinoona the mill from the phone. — Nyasha Mutasa, CEO',
      },
      {
        photo: shot('photo-1565008447742-97f6f38c985c'),
        testimonial:
          'For a mill like this, the calculating system is the asset. Zvechokwadi, counts and output now sit in one place. — Nyasha Mutasa, CEO',
      },
    ],
  },
  {
    id: 'ridgeline',
    name: 'it Wasu Contractors',
    category: 'Construction',
    shelf: 'Best selling',
    rating: 4.8,
    hue: '#9a3412',
    showOnGrid: true,
    featurePhotos: true,
    featurePhotoCount: 2,
    video: REEL.weld,
    videoCaption: 'Deck reel from the crew on site.',
    location: 'Zimbabwe',
    ceo: 'Tawanda Ncube',
    about: 'it Wasu Contractors QS and engineers work from Fortress, with storeroom tracking and live site valuations.',
    slides: [
      {
        photo: shot('photo-1621905252507-b35492cc74b4'),
        testimonial:
          'I’m the CEO. Fortress cut the paperwork for QS and engineers. Ndatenda — claims now sit pano instead of in the trailer. — Tawanda Ncube, CEO',
      },
      {
        photo: pexel(8487367),
        testimonial:
          'With that time back, it Wasu Contractors took on more sites and more tenders. Zvinhu zviri kufamba — the same crew runs a bigger book from the phone. — Tawanda Ncube, CEO',
      },
      {
        photo: pexel(27647858),
        testimonial:
          'Theft is down because Fortress tracks storeroom stock. Zvechokwadi, cement and fuel have a log before they leave the yard. — Tawanda Ncube, CEO',
      },
      {
        photo: shot('photo-1590496793929-36417d3117de'),
        testimonial:
          'Valuations land pano on a cumulative dashboard. SHEQ files sit on the same system. Ndatenda. — Tawanda Ncube, CEO',
      },
      {
        photo: shot('photo-1517581177682-a085bb7ffb15'),
        testimonial:
          'I open Fortress and ndinoona every deck — stock, valuations, and SHEQ — without calling the trailer. Zvakanaka. — Tawanda Ncube, CEO',
      },
    ],
  },
  {
    id: 'ironleaf',
    name: 'Ironleaf Mills',
    category: 'Manufacturing',
    shelf: 'Best selling',
    rating: 4.7,
    hue: '#3f3f46',
    location: 'Gary, IN',
    ceo: 'Tendai Moyo',
    about: 'Ironleaf tracks mill materials, consumed stock, and sales estimates on Fortress dashboards.',
    slides: [
      {
        photo: shot('photo-1565043666747-69f6646db940'),
        testimonial:
          'I’m the CEO of this coil mill. Fortress cut the paperwork so engineers post the run pano. Ndatenda. — Tendai Moyo, CEO',
      },
      {
        photo: shot('photo-1504917595217-d4dc5ebe6122'),
        testimonial:
          'Coil and sheet sit in the storeroom. Fortress calculates consumed stock as the press runs, so the mill always knows what left the rack.',
      },
      {
        photo: shot('photo-1581092918056-0c4c3acd3789'),
        testimonial:
          'The system tracks those materials from yard to press. Stock is managed by live counts, not a weekly walk.',
      },
      {
        photo: shot('photo-1565008447742-97f6f38c985c'),
        testimonial:
          'It estimates sales on dashboards as coil and formed parts leave the plant. The mill and the office read one number for what shipped.',
      },
      {
        photo: shot('photo-1504328345606-18bbc8c9d7d1'),
        testimonial:
          'SHEQ and I open Fortress and see the floor without a walk-down. Zvechokwadi, the records stay intact. — Tendai Moyo, CEO',
      },
    ],
  },
  {
    id: 'pylon',
    name: 'Pylon & Co.',
    category: 'Construction',
    shelf: 'Best selling',
    rating: 4.8,
    hue: '#1e3a5f',
    location: 'Austin, TX',
    about: 'Pylon uses Fortress for QS workload, site valuations, and storeroom control on every job.',
    slides: [
      {
        photo: pexel(8487724),
        testimonial:
          'I’m the CEO. Fortress cut QS paperwork. Measures and claims sit pano — ndatenda. — Simba Mhlanga, CEO',
      },
      {
        photo: shot('photo-1621905252472-943afaa20e20'),
        testimonial:
          'With that time back, Pylon has taken on more sites and more tenders. Valuations are recorded on site and the cumulative dashboard is already up to date.',
      },
      {
        photo: shot('photo-1486406146926-c627a92ad1ab'),
        testimonial:
          'Theft is down because Fortress tracks storeroom stock. Cement and fuel movements are logged before they leave the yard.',
      },
      {
        photo: shot('photo-1590496793929-36417d3117de'),
        testimonial:
          'SHEQ files live next to the lift photos. Safety and production stopped using two different folders.',
      },
      {
        photo: pexel(8487371),
        testimonial:
          'Ndinoona the structure, the stock, and the valuation from the phone. Handichafona the trailer. — Simba Mhlanga, CEO',
      },
    ],
  },
  {
    id: 'harbor',
    name: 'Harbor & Beam',
    category: 'Construction',
    shelf: 'Trending',
    rating: 4.9,
    hue: '#0f4c5c',
    video: REEL.crane,
    videoCaption: 'Site reel from the pour.',
    location: 'Seattle, WA',
    ceo: 'Rudo Nyathi',
    about: 'Harbor & Beam runs pours, tenders, and storeroom stock from the Fortress website.',
    slides: [
      {
        photo: pexel(8487363),
        testimonial:
          'I’m the CEO. Fortress cut QS paperwork, and clients approve the next pour from the same site. Zvakanaka. — Rudo Nyathi, CEO',
      },
      {
        photo: shot('photo-1590496793929-36417d3117de'),
        testimonial:
          'With that time back, Harbor has taken on more sites and more tenders. Valuations sit on a cumulative dashboard, not in email.',
      },
      {
        photo: shot('photo-1429497419816-9ca5cfb4571a'),
        testimonial:
          'Theft is down because Fortress tracks storeroom stock. Cement and fuel movements are on the website before the gate closes.',
      },
      {
        photo: pexel(8487760),
        testimonial:
          'The website records pour valuations on site and rolls them into the dashboard. SHEQ files live with the same records.',
      },
      {
        photo: shot('photo-1517581177682-a085bb7ffb15'),
        testimonial:
          'Ndinoona the deck, the stock, and the valuation from the phone. Fortress is the control room for the site. — Rudo Nyathi, CEO',
      },
    ],
  },
  {
    id: 'voltform',
    name: 'Voltform Industrial',
    category: 'Manufacturing',
    shelf: 'Trending',
    rating: 4.6,
    hue: '#7c2d12',
    video: REEL.factory,
    videoCaption: 'Line reel from the bay.',
    location: 'Detroit, MI',
    ceo: 'Tafadzwa Sibanda',
    about: 'Voltform tracks consumed stock, line output, and sales estimates on Fortress.',
    slides: [
      {
        photo: shot('photo-1621905251918-48416bd8575a'),
        testimonial:
          'I’m the plant CEO. Line leads post the bay pano instead of a second spreadsheet. Ndatenda. — Tafadzwa Sibanda, CEO',
      },
      {
        photo: pexel(3912981),
        testimonial:
          'Paint, parts, and solvents sit in the storeroom. Fortress calculates consumed stock as the booth runs, so purchasing reorders from the site.',
      },
      {
        photo: pexel(27647858),
        testimonial:
          'The system tracks those materials from delivery to booth. Stock is managed by live counts, not a guess at shift change.',
      },
      {
        photo: shot('photo-1565008447742-97f6f38c985c'),
        testimonial:
          'It estimates sales on dashboards as finished work leaves the plant. Quality and production share one formula file, and the market for the line has grown.',
      },
      {
        photo: shot('photo-1504328345606-18bbc8c9d7d1'),
        testimonial:
          'I open Fortress and ndinoona booth, stock, and sales. Zvechokwadi, the process records stay intact. — Tafadzwa Sibanda, CEO',
      },
    ],
  },
  {
    id: 'fieldnote',
    name: 'Fieldnote Builders',
    category: 'Construction',
    shelf: 'New companies',
    rating: 4.7,
    hue: '#365314',
    showOnGrid: true,
    location: 'Nashville, TN',
    ceo: 'Tatenda Chirwa',
    about: 'Fieldnote started on Fortress so QS, stock, and the CEO already share one site.',
    slides: [
      {
        photo: pexel(1216589),
        testimonial:
          'I’m the CEO. From day one the phone is the job trailer. Ndatenda. — Tatenda Chirwa, CEO',
      },
      {
        photo: pexel(585419),
        testimonial:
          'With that time back, Fieldnote can grow first pours and first tenders without growing paperwork.',
      },
      {
        photo: pexel(1117452),
        testimonial:
          'Theft has nowhere to hide because Fortress tracks storeroom stock. Cement and fuel have a log from the first delivery.',
      },
      {
        photo: pexel(209251),
        testimonial:
          'Valuations are recorded on site and roll into a cumulative dashboard. Monday meetings now open that same screen.',
      },
      {
        photo: shot('photo-1486406146926-c627a92ad1ab'),
        testimonial:
          'SHEQ and my CEO view were built in from the start. Ndinoona whatever is happening on site. Zvakanaka. — Tatenda Chirwa, CEO',
      },
    ],
  },
  {
    id: 'siteworks',
    name: 'Test Siteworks',
    category: 'Construction',
    shelf: 'New companies',
    rating: 4.6,
    hue: '#3f6212',
    showOnGrid: true,
    location: 'Harare',
    ceo: 'Kudzi Ndlovu',
    about: 'Test Siteworks runs earthworks, pads, and storeroom tracking from Fortress.',
    slides: [
      {
        photo: shot('photo-1503387762-592deb58ef4e'),
        testimonial: 'Siteworks yard on a cut-and-fill day. — Kudzi Ndlovu, CEO',
      },
      {
        photo: shot('photo-1541888946425-d81bb19240f5'),
        testimonial: 'Excavator and pad works logged on the company card.',
      },
      {
        photo: shot('photo-1581094794329-c8112a89af12'),
        testimonial: 'Formwork and rebar before the next pour.',
      },
      {
        photo: pexel(2219024),
        testimonial: 'Storeroom cement and fuel leave with a Fortress log.',
      },
      {
        photo: shot('photo-1504307651254-35680f356dfd'),
        testimonial: 'Ndinoona the deck progress from the phone. — Kudzi Ndlovu, CEO',
      },
    ],
  },
]

const seedNote = (id, author, text, replies = []) => ({
  id,
  authorId: 'seed',
  author,
  text,
  replies: replies.map((reply, index) => ({
    id: `${id}-r${index}`,
    authorId: 'seed',
    author: reply.author,
    text: reply.text,
  })),
})

const DEMO_COMMENTS = {
  'photo:prixburg:0': [
    seedNote('pb0b', 'Nyasha Mutasa, CEO', 'Same for our mill. Ndinoona the run without walking the bay.'),
  ],
  'photo:apex:0': [
    seedNote('ap0a', 'Nyasha Mutasa, CEO', 'Ndatenda. Heat numbers live pano now, not on clipboards.'),
  ],
  'photo:apex:1': [
    seedNote('ap1a', 'Nyasha Mutasa, CEO', 'Storeroom steel is on the website. Zvakanaka — shortages show before the bay runs dry.'),
  ],
  'photo:ridgeline:0': [
    seedNote('rg0a', 'Tawanda Ncube, CEO', 'I’m the CEO of it Wasu Contractors. Ndatenda — claims sit pano instead of in the trailer.'),
  ],
  'photo:ridgeline:1': [
    seedNote('rg1a', 'Tawanda Ncube, CEO', 'More sites, more tenders. Zvinhu zviri kufamba at it Wasu Contractors.'),
    seedNote('rg1b', 'Rudo Nyathi, CEO', 'Zvakanaka. The crew already updates the website before I call.'),
  ],
  'photo:ridgeline:2': [
    seedNote('rg2a', 'Tawanda Ncube, CEO', 'Zvechokwadi, cement and fuel now have a log. Theft has nowhere to hide.'),
  ],
  'photo:ridgeline:3': [
    seedNote('rg3a', 'Tawanda Ncube, CEO', 'Valuations sit pano with SHEQ. Ndatenda.'),
  ],
  'photo:ridgeline:4': [
    seedNote('rg4a', 'Tawanda Ncube, CEO', 'Ndinoona every deck from the phone. Handichafona the trailer.'),
  ],
  'photo:ironleaf:0': [
    seedNote('il0a', 'Tendai Moyo, CEO', 'Engineers post the run pano. Ndatenda — clipboards are done.'),
  ],
  'photo:siteworks:0': [
    seedNote('sw0a', 'Kudzi Ndlovu, CEO', 'Cut and fill stays on the card. Zvakanaka.'),
  ],
  'photo:pylon:0': [
    seedNote('py0a', 'Simba Mhlanga, CEO', 'Makorokoto. Measures and claims sit pano. Handichafona the trailer.'),
  ],
  'photo:harbor:0': [
    seedNote('hb0a', 'Rudo Nyathi, CEO', 'Clients approve the next pour from this picture. Zvakanaka.'),
  ],
  'photo:voltform:0': [
    seedNote('vf0a', 'Tafadzwa Sibanda, CEO', 'Line leads post the bay pano. Ndatenda.'),
  ],
  'photo:fieldnote:0': [
    seedNote('fn0a', 'Tatenda Chirwa, CEO', 'From day one the phone is the trailer. Zvakanaka.'),
  ],
}

const BLOCKED_COMMENT_AUTHORS = ['patrick mbizvo', 'tawanda chitukutuku']

const isBlockedCommentAuthor = (author) => {
  const name = String(author || '')
    .toLowerCase()
    .replace(/,?\s*ceo\s*$/i, '')
    .trim()
  return BLOCKED_COMMENT_AUTHORS.some((blocked) => name.includes(blocked))
}

const stripBlockedComments = (thread) =>
  (Array.isArray(thread) ? thread : [])
    .filter((note) => !isBlockedCommentAuthor(note?.author))
    .map((note) => ({
      ...note,
      replies: (note.replies || []).filter((reply) => !isBlockedCommentAuthor(reply?.author)),
    }))

const withDemoComments = (saved) => {
  const next = {}
  Object.entries(DEMO_COMMENTS).forEach(([key, thread]) => {
    const cleaned = stripBlockedComments(thread)
    if (cleaned.length) next[key] = cleaned
  })
  Object.entries(saved || {}).forEach(([key, thread]) => {
    if (String(key).toLowerCase().includes('sparkstech')) return
    if (!Array.isArray(thread) || !thread.length) return
    const cleaned = stripBlockedComments(thread)
    if (cleaned.length) next[key] = cleaned
    else if (Object.prototype.hasOwnProperty.call(DEMO_COMMENTS, key)) return
    else next[key] = []
  })
  return next
}

const confirmDeleteTwice = (itemLabel = 'this item') => {
  if (typeof window === 'undefined') return false
  const first = window.confirm(`Delete ${itemLabel}?`)
  if (!first) return false
  return window.confirm(`Please confirm again. Delete ${itemLabel} permanently?`)
}

const formatPrice = (price) =>
  `$${Number(price).toLocaleString('en-US', {
    minimumFractionDigits: Number(price) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`

const TRIAL_DAYS = 14
const TRIAL_MS = TRIAL_DAYS * 86400000

const siteTrialEnded = (site) => {
  if (!site || site.catalogId) return false
  if (site.billingStatus === 'paused') return true
  if (site.billingStatus !== 'trial') return false
  return Number(site.trialUntil) > 0 && Date.now() > Number(site.trialUntil)
}

function PausedTrial({ site, onSubscribe, onBack }) {
  return (
    <section className="panel-box settings-page trial-paused">
      {onBack ? (
        <button type="button" className="text-back" onClick={onBack}>
          Back
        </button>
      ) : null}
      <h3>Your app is paused. Subscribe to reactivate.</h3>
      <p className="shop-copy">
        {site?.name || 'This app'} is still here with its photos, services, and data. It stays locked until you subscribe.
      </p>
      <button type="button" className="primary-button" onClick={onSubscribe}>
        Subscribe to reactivate
      </button>
    </section>
  )
}

const MENU_ACTIONS = [
  { id: 'buy', label: 'Buy CEO Website' },
]

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'profile', label: 'Profile' },
  ...MENU_ACTIONS,
  { id: 'settings', label: 'Settings' },
]

const GUEST_NAV = [
  { id: 'home', label: 'Home' },
  ...MENU_ACTIONS,
  { id: 'login', label: 'Login' },
]

function IconHome() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 3.1 3 10.4h2.2V21h5.3v-6.2h3V21h5.3v-10.6H21L12 3.1z" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12.2a4.2 4.2 0 1 0-4.2-4.2 4.2 4.2 0 0 0 4.2 4.2zm0 2.1c-3.6 0-7.2 1.8-7.2 4.4V21h14.4v-2.3c0-2.6-3.6-4.4-7.2-4.4z"
      />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.4 13.5a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.6-1.5l-.4-2.6h-4l-.4 2.6a7.4 7.4 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0-.1 1.5 7.7 7.7 0 0 0 .1 1.5l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"
      />
    </svg>
  )
}

function IconLogin() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 17v-3H3v-4h7V7l5 5-5 5zm9-14H12v2h7v14h-7v2h9V3h-2z"
      />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 17l5-5-5-5v3H3v4h7v3zm9-14h-9v2h9v14h-9v2h11V3h-2z"
      />
    </svg>
  )
}

function IconCalc() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1 3v4h10V6H7zm0 6h3v2H7v-2zm5 0h5v2h-5v-2zm-5 3h3v3H7v-3zm5 0h5v3h-5v-3z"
      />
    </svg>
  )
}

function IconBuy() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.4 9h-3.1a15 15 0 0 0-1.4-5.4A8.1 8.1 0 0 1 19.4 11zM12 4.1c.9 1.2 1.7 3.3 2 6.9H10c.3-3.6 1.1-5.7 2-6.9zM4.6 13h3.1a15 15 0 0 0 1.4 5.4A8.1 8.1 0 0 1 4.6 13zm3.1-2H4.6A8.1 8.1 0 0 1 9.1 5.6 15 15 0 0 0 7.7 11zM12 19.9c-.9-1.2-1.7-3.3-2-6.9h4c-.3 3.6-1.1 5.7-2 6.9zm2.9-1.5A15 15 0 0 0 16.3 13h3.1a8.1 8.1 0 0 1-4.5 5.4z"
      />
    </svg>
  )
}

const NAV_ICONS = {
  home: IconHome,
  profile: IconProfile,
  settings: IconSettings,
  login: IconLogin,
  logout: IconLogout,
  calc: IconCalc,
  buy: IconBuy,
}

function IconGrid() {
  return (
    <svg className="ig-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"
      />
    </svg>
  )
}

function IconCompanyTab() {
  return (
    <svg className="ig-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 21V7l8-4 8 4v14h-6v-6h-4v6H4zm8-9.2A1.8 1.8 0 1 0 10.2 10 1.8 1.8 0 0 0 12 11.8z"
      />
    </svg>
  )
}


const makeId = (prefix = 'id') =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('failed'))
    reader.readAsDataURL(file)
  })

const isVideoSrc = (src = '') =>
  /^data:video\/|^blob:|\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(src))

const compressImageFile = (file, maxEdge = 1400, quality = 0.78) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      readFileAsDataUrl(file).then(resolve, reject)
    }
    image.src = url
  })

const readMediaFile = async (file) => {
  if (!file) return null
  if (file.type.startsWith('video/') || isVideoSrc(file.name)) {
    if (file.size > 3.5 * 1024 * 1024) {
      throw new Error('Choose a shorter video (about 3 MB or less).')
    }
    return { kind: 'video', src: await readFileAsDataUrl(file) }
  }
  return { kind: 'photo', src: await compressImageFile(file) }
}

const FAB_PLANS = [{ id: 'month', label: '1 month', price: 100, days: 30 }]

/** Fabrication calculator is $100/month, or a 14 day trial. It does not open for free. */

const fabSubscriptionActive = (site) => Number(site?.paidUntil) > Date.now()

const fabTrialActive = (site) =>
  Boolean(site?.id) &&
  !site?.catalogId &&
  site?.billingStatus === 'trial' &&
  Number(site.trialUntil) > Date.now()

const fabAccessActive = (site) => fabSubscriptionActive(site) || fabTrialActive(site)

const GATE_COMPLEXITY = [
  { id: 'simple', label: 'Simple design', rate: 45, copy: 'Straight frame, rails, and standard infill.' },
  { id: 'medium', label: 'Medium design', rate: 78, copy: 'Spears, mixed panels, and extra rails.' },
  { id: 'laser', label: 'Complex design', rate: 128, copy: 'Laser-cut or decorative ironwork on this gate type.' },
]

const GATE_TYPES = [
  { id: 'sliding', name: 'Sliding gate', copy: 'Leaf rolls aside on a track.' },
  { id: 'swing', name: 'Swing gate', copy: 'Leaves hinge open like a door.' },
  { id: 'cantilever', name: 'Cantilever gate', copy: 'Hangs on rollers. No track across the driveway.' },
  { id: 'bifold', name: 'Bi-fold gate', copy: 'Panels fold in half to save swing space.' },
  { id: 'telescopic', name: 'Telescopic gate', copy: 'Leaves stack into each other as they open.' },
  { id: 'pedestrian', name: 'Pedestrian gate', copy: 'A person-sized side gate with a latch.' },
  { id: 'automatic', name: 'Automatic electric gate', copy: 'Motor, rack, and safety beams on the leaf.' },
  { id: 'wrought', name: 'Wrought iron decorative gate', copy: 'Scrolls, rings, and spear tops in iron.' },
]

const GATE_CONSTRUCTIONS = [
  { id: 'bars', label: 'Simple gate with vertical bars', copy: 'Middle bars after every interval you enter.' },
  { id: 'infill', label: 'Simple gate with infill cladding', copy: 'IBR sheet or square-tube palisade.' },
]

const FAB_CALC_TYPES = [
  { id: 'sliding', name: 'Sliding Gate', copy: '1 gate slides' },
  { id: 'swing-double', name: 'Swing Gate Double', copy: '2 gates' },
  { id: 'swing-single', name: 'Single Swing Gate', copy: '' },
]

const FAB_CALC_DESIGNS = [
  { id: 'palisade', title: 'Palisade', copy: '25x25 tubes with gaps' },
  { id: 'solid', title: 'Solid Private', copy: 'IBR Sheet - No see through' },
  { id: 'half', title: 'Half & Half', copy: 'Sheet bottom, tubes top' },
]

const FAB_STOCK = 6
const FAB_OVERLAP = 0.4
const FAB_DEFAULT_SPACING = 0.12
const FAB_BAR_CLEARANCE = 0.1
const FAB_TUBE_WASTAGE = 1.1
const FAB_MIDDLE_VERTICALS = 3
const FAB_SHEET_WIDTH = 0.9
const FAB_HALF_SHEET_H = 1.0
const FAB_QUOTES_KEY = 'fortress-fab-quotes-v1'
const FAB_PROJECTS_KEY = 'fortress-fab-projects-v1'
const FAB_DRAWING_TEMPLATES_KEY = 'fortress-fab-drawing-templates-v1'
const FAB_STEEL_WASTE = 1.1

const DRAWING_TYPE_LABELS = {
  steel_structure: 'Steel structure',
  carport: 'Carport',
  warehouse: 'Warehouse',
  workshop: 'Workshop',
  staircase: 'Staircase',
  gate: 'Gate',
  burglar: 'Burglar bars',
  burglar_bars: 'Burglar bars',
  palisade_fence: 'Palisade fencing',
  roof_plan: 'Roof plan',
  building_plan: 'Building plan',
  architectural: 'Architectural plan',
  rc_columns: 'RC columns (D01/D02)',
  column_layout: 'RC column layout',
  unknown: 'Drawing / plan',
}

const drawingTypeLabel = (type) => DRAWING_TYPE_LABELS[type] || type || 'Drawing / plan'
const isScheduleJob = (jobType) => jobType === 'structure' || jobType === 'rc_columns'
const jobTypeLabel = (jobType, drawingType) => {
  if (jobType === 'gate') return 'Gate'
  if (jobType === 'palisade') return 'Palisade fencing'
  if (jobType === 'burglar') return 'Burglar bars'
  if (drawingType) return drawingTypeLabel(drawingType)
  if (jobType === 'rc_columns') return 'RC columns (D01/D02)'
  if (jobType === 'structure') return 'Steel structure'
  return 'Drawing'
}

const defaultStructureSchedule = () => [
  { id: 'col', role: 'Columns', section: 'H 120x120', unit: 'm', qty: '6', meters: '29.7', priceKey: 'h120PerM' },
  { id: 'raf', role: 'Rafters', section: 'PFC 150x75', unit: 'm', qty: '7', meters: '28.38', priceKey: 'pfc150PerM' },
  { id: 'pur', role: 'Purlins', section: 'LC 125', unit: 'm', qty: '7', meters: '49.0', priceKey: 'lc125PerM' },
  { id: 'gir', role: 'Girts', section: 'LC 100', unit: 'm', qty: '20', meters: '88.59', priceKey: 'lc100PerM' },
  { id: 'bra', role: 'Braces', section: 'L 50x50x5', unit: 'm', qty: '', meters: '11.9', priceKey: 'angle50PerM' },
  { id: 'plt', role: 'Plates', section: '200x200x10', unit: 'kg', qty: '12', meters: '', kgEach: '3.14', priceKey: 'platePerKg' },
  { id: 'b16hd', role: 'Bolts M16 HD', section: 'M16 HD', unit: 'qty', qty: '24', meters: '', priceKey: 'boltM16' },
  { id: 'b1688', role: 'Bolts M16 8.8', section: 'M16 8.8', unit: 'qty', qty: '20', meters: '', priceKey: 'boltM16_88' },
  { id: 'b12', role: 'Bolts M12', section: 'M12', unit: 'qty', qty: '84', meters: '', priceKey: 'boltM12' },
]

const GATE_DESIGNS = [
  { id: 'spear', name: 'Spear-top driveway', photo: pexel(277572) },
  { id: 'scroll', name: 'Scroll iron double leaf', photo: pexel(277559) },
  { id: 'palisade', name: 'Palisade yard gate', photo: pexel(206172) },
  { id: 'pedestrian', name: 'Pedestrian side gate', photo: pexel(1301856) },
  { id: 'tube', name: 'Tube-frame sliding', photo: pexel(1115804) },
  { id: 'arch', name: 'Arch-top entrance', photo: pexel(221433) },
  { id: 'laser-leaf', name: 'Laser leaf panel', photo: shot('photo-1505843513577-22bb7d21e007') },
  { id: 'steel-sheet', name: 'Steel sheet sliding', photo: shot('photo-1472220625704-91e1462799b2') },
]

const HOME_ADS = [
  {
    id: 'ad-fab',
    kicker: 'Ad',
    title: 'Fabrication website',
    copy: 'Zantac template · $100 a month',
  },
  {
    id: 'ad-site',
    kicker: 'Ad',
    title: 'Buy a Fortress website',
    copy: 'Construction (Rodcroft) or manufacturing (Prixburg) websites.',
  },
]

const SYSTEM_TYPES = [
  {
    id: 'fabrication',
    label: 'Fabrication website',
    style: 'Zantac template',
    how: 'A private Zantac-template fabrication website. Pick a gate design, enter width and height, then choose simple, medium, or complex laser cut. Pay $100 a month, or start a 14 day trial.',
    preview: GATE_DESIGNS.slice(0, 4).map((gate) => gate.photo),
    slides: GATE_DESIGNS.slice(0, 5).map((gate, index) => ({
      photo: gate.photo,
      testimonial: [
        'A fabricator quotes from memory and loses jobs. This calculator starts with a gate design so the customer sees the same picture you will build.',
        'Width and height in metres turn into area. The quote is not a guess — it is the size of the gate times the design rate.',
        'Simple, medium, or laser-cut complexity changes the rate. A spear-top driveway is not priced like a laser leaf.',
        'Saved quotations sit on your fabrication webpage so the workshop can open the same numbers on the phone.',
        'Pay $100 a month. The exclusive calculator link stays on the owner profile; other people do not see it.',
      ][index],
    })),
  },
  {
    id: 'construction',
    label: 'Construction website',
    style: 'Rodcroft template',
    how: 'A private Rodcroft-template website generated from CEO metadata. Hosted on <company>.fortress.vercel.app showing sites, valuations, storeroom stock, fuel schedules, and SHEQ.',
    preview: [MEDIA.rodcroftPhoto1, MEDIA.rodcroftPhoto2, MEDIA.rodcroftPhoto3, MEDIA.rodcroftPhoto4],
    slides: [
      {
        photo: MEDIA.rodcroftPhoto1,
        testimonial:
          'On a construction company, QS and engineers lose days to paper. This website puts measurements and claims on one phone so the job is not waiting on a trailer file.',
      },
      {
        photo: MEDIA.rodcroftPhoto2,
        testimonial:
          'That time back lets the same crew take more sites and more tenders. The construction website grows the book without growing the admin team.',
      },
      {
        photo: MEDIA.rodcroftPhoto3,
        testimonial:
          'Theft hides in an open storeroom. Cement and fuel get a log before they leave the yard, so shortages show on the CEO phone, not after the pour.',
      },
      {
        photo: MEDIA.rodcroftPhoto4,
        testimonial:
          'Valuations and SHEQ used to live in email. They now land on a live dashboard so the CEO sees every site without calling the foreman.',
      },
      {
        photo: MEDIA.rodcroftPhoto3,
        video: MEDIA.rodcroft1,
        testimonial:
          'From the gate to the storeroom, this is the live picture of a construction company. The exclusive link stays on the owner’s profile. Other people only see posts.',
      },
    ],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing website',
    style: 'Prixburg template',
    how: 'A private Prixburg-template website generated from CEO metadata. Hosted on <company>.fortress.vercel.app showing storeroom materials, formulas, consumed stock, sales, and CEO profit analysis.',
    preview: [MEDIA.prixburg1, MEDIA.prixburg2, MEDIA.prixburg3, MEDIA.prixburg4, MEDIA.prixburg5],
    slides: [
      {
        photo: MEDIA.prixburg1,
        testimonial:
          'A chemical plant loses product when the floor and the office keep two books. This manufacturing website puts mixing and the CEO view on one phone.',
      },
      {
        photo: MEDIA.prixburg2,
        testimonial:
          'Raw materials sit in the storeroom. Fortress calculates consumed stock as batches run, so a shortage shows before a line stops.',
      },
      {
        photo: MEDIA.prixburg3,
        testimonial:
          'The system tracks those materials from delivery to mix. Stock is managed by live counts, not a book that is a week behind.',
      },
      {
        photo: MEDIA.prixburg4,
        testimonial:
          'Sales of dishwasher, toilet cleaner, and fabric softener update as goods leave the plant. The CEO sees output without walking the bay.',
      },
      {
        photo: MEDIA.prixburg5,
        testimonial:
          'Formulas stay intact on the live domain. For a factory like this, the calculating system is the asset — exclusive to the owner, not on a public profile.',
      },
    ],
  },
]

const systemIdFromCompany = (company) => {
  if (company?.systemType && SYSTEM_TYPES.some((item) => item.id === company.systemType)) {
    return company.systemType
  }
  const label = `${company?.category || ''} ${company?.type || ''}`.toLowerCase()
  if (label.includes('manufactur')) return 'manufacturing'
  return 'construction'
}

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'website'

const brandTheme = (name = '') => {
  const brand = String(name).trim() || 'Company'
  let hash = 0
  for (let i = 0; i < brand.length; i += 1) hash = (hash * 31 + brand.charCodeAt(i)) >>> 0
  const hue = hash % 360
  const mark = brand.charAt(0).toUpperCase()
  return {
    name: brand,
    mark,
    slug: slugify(brand),
    cssName: slugify(brand).replace(/-/g, '') || 'company',
    hue,
    vars: {
      '--brand-name': `"${brand.replace(/"/g, '')}"`,
      '--brand-hue': String(hue),
      '--brand-ink': `hsl(${hue} 10% 8%)`,
      '--brand-canvas': `hsl(${hue} 8% 96%)`,
      '--brand-paper': '#ffffff',
      '--brand-line': `hsl(${hue} 8% 86%)`,
      '--brand-muted': `hsl(${hue} 6% 42%)`,
      '--brand-fill': `hsl(${hue} 12% 12%)`,
    },
  }
}

const makeWebsite = ({
  id = '',
  name,
  type = 'Business',
  systemType = '',
  slug = '',
  link = '',
  profilePhoto = '',
  gallery = [],
  photoCaptions = [],
  testimonial = '',
  slides = [],
  isShop = false,
  items = [],
  brandName = '',
  cssName = '',
  fabPlan = '',
  paidUntil = 0,
  billingStatus = '',
  trialUntil = 0,
  domain = '',
  drawings = [],
  catalogId = '',
  ceo = '',
  ceoTestimonial = '',
  seedMediaVersion = 0,
}) => ({
  id: id || makeId('site'),
  name,
  type,
  systemType,
  slug,
  link,
  profilePhoto,
  gallery,
  photoCaptions,
  testimonial,
  slides,
  isShop,
  items,
  brandName: brandName || name,
  cssName: cssName || slugify(brandName || name).replace(/-/g, ''),
  fabPlan,
  paidUntil,
  billingStatus,
  trialUntil,
  domain,
  drawings,
  catalogId,
  ceo,
  ceoTestimonial,
  seedMediaVersion,
})

const makeAccount = (email, password, companyName, { withWebsite = true, id = '' } = {}) => ({
  id: id || makeId('account'),
  email,
  password,
  linkedAccountIds: [],
  websites: withWebsite ? [makeWebsite({ name: companyName || 'My company', type: 'Business' })] : [],
})

const websiteFromCatalog = (entry, login) => {
  const slides = entry.slides || []
  const [first, ...rest] = slides
  return makeWebsite({
    id: login.siteId,
    name: entry.name,
    type: entry.category || 'Business',
    systemType: systemIdFromCompany(entry),
    slug: entry.id,
    link: companyLiveSite({ catalogId: entry.id })?.home || '',
    profilePhoto: first?.photo || '',
    testimonial: '',
    slides,
    // Keep gallery aligned with every card slide so profile grid matches home cards.
    gallery: slides.map((slide) => slide.photo || slide.video).filter(Boolean),
    photoCaptions: slides.map((slide) => slide.testimonial || ''),
    catalogId: entry.id,
    ceo: entry.ceo || '',
    ceoTestimonial: '',
    seedMediaVersion: CATALOG_MEDIA_SEED,
  })
}

const withOwnerLogin = (list) => {
  const accounts = Array.isArray(list) ? list.map((account) => ({ ...account })) : []
  const ownerIndex = accounts.findIndex((account) => account.email?.toLowerCase() === OWNER_LOGIN.email)
  if (ownerIndex >= 0) {
    accounts[ownerIndex] = { ...accounts[ownerIndex], ...OWNER_LOGIN }
    return accounts
  }
  const demoIndex = accounts.findIndex((account) => account.email?.toLowerCase() === 'demo@fortress.com')
  if (demoIndex >= 0) {
    accounts[demoIndex] = { ...accounts[demoIndex], ...OWNER_LOGIN }
    return accounts
  }
  return [makeAccount(OWNER_LOGIN.email, OWNER_LOGIN.password, '', { withWebsite: false }), ...accounts]
}

const isSparksTechAccount = (account) => {
  const email = String(account?.email || '').toLowerCase()
  if (email.includes('sparkstech')) return true
  if (account?.id === 'account-sparkstech') return true
  return (account?.websites || []).some(
    (site) =>
      site?.catalogId === 'sparkstech' ||
      site?.id === 'site-sparkstech' ||
      site?.slug === 'sparkstech' ||
      String(site?.name || '').toLowerCase() === 'sparkstech',
  )
}

const stripSparksTech = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((account) => !isSparksTechAccount(account))
    .map((account) => ({
      ...account,
      websites: (account.websites || []).filter(
        (site) =>
          site?.catalogId !== 'sparkstech' &&
          site?.id !== 'site-sparkstech' &&
          site?.slug !== 'sparkstech' &&
          String(site?.name || '').toLowerCase() !== 'sparkstech',
      ),
    }))

const withCompanyAccounts = (list) => {
  const accounts = withOwnerLogin(stripSparksTech(list))
  COMPANY_LOGINS.forEach((login) => {
    const catalogEntry = catalog.find((entry) => entry.id === login.catalogId)
    if (!catalogEntry) return
    const index = accounts.findIndex((account) => account.email?.toLowerCase() === login.email)
    const seededSite = websiteFromCatalog(catalogEntry, login)
    if (catalogEntry.systemType === 'fabrication') {
      seededSite.billingStatus = 'paid'
      seededSite.fabPlan = 'month'
      seededSite.paidUntil = Date.now() + 365 * 24 * 60 * 60 * 1000
    }
    if (index < 0) {
      accounts.push({
        id: login.accountId,
        email: login.email,
        password: login.password,
        websites: [seededSite],
      })
      return
    }

    const account = {
      ...accounts[index],
      id: accounts[index].id || login.accountId,
      email: login.email,
      password: login.password,
    }
    const siteIndex = account.websites.findIndex(
      (site) =>
        site.catalogId === login.catalogId || site.id === login.siteId || site.slug === login.catalogId,
    )
    if (siteIndex < 0) {
      account.websites = [...account.websites, seededSite]
    } else {
      account.websites = account.websites.map((site, current) => {
        if (current !== siteIndex) return site
        const refreshMedia = site.seedMediaVersion !== CATALOG_MEDIA_SEED
        return {
          ...site,
          id: site.id || login.siteId,
          catalogId: login.catalogId,
          slug: site.slug || login.catalogId,
          name: site.nameEdited ? site.name : site.name || catalogEntry.name,
          type: catalogEntry.category || site.type,
          systemType: systemIdFromCompany(catalogEntry) || site.systemType,
          ceo:
            site.ceoEdited || site.ceo != null ? site.ceo : catalogEntry.ceo || '',
          ceoTestimonial: '',
          testimonial: '',
          link: site.link || companyLiveSite({ catalogId: login.catalogId })?.home || seededSite.link || '',
          billingStatus: catalogEntry.systemType === 'fabrication' ? 'paid' : site.billingStatus,
          fabPlan: catalogEntry.systemType === 'fabrication' ? site.fabPlan || 'month' : site.fabPlan,
          paidUntil:
            catalogEntry.systemType === 'fabrication'
              ? Number(site.paidUntil) > Date.now()
                ? site.paidUntil
                : Date.now() + 365 * 24 * 60 * 60 * 1000
              : site.paidUntil,
          profilePhoto: refreshMedia ? seededSite.profilePhoto : site.profilePhoto || seededSite.profilePhoto,
          slides: refreshMedia || !site.slides?.length ? seededSite.slides : site.slides,
          gallery: refreshMedia || !site.gallery?.length ? seededSite.gallery : site.gallery,
          photoCaptions:
            refreshMedia || !site.photoCaptions?.length ? seededSite.photoCaptions : site.photoCaptions,
          seedMediaVersion: CATALOG_MEDIA_SEED,
        }
      })
    }
    accounts[index] = account
  })
  return accounts
}

const readHashPath = () => {
  if (typeof window === 'undefined') return '/home'
  const raw = window.location.hash.replace(/^#/, '')
  return raw && raw !== '/' ? raw : '/home'
}

const encodeId = (id) => encodeURIComponent(String(id))

const pathFromNav = ({ tab, settingsView, overlay }) => {
  if (overlay?.type === 'gallery' && overlay.company?.id) {
    return `/${tab || 'home'}/card/${encodeId(overlay.company.id)}`
  }
  if (overlay?.type === 'profile' && overlay.company?.id) {
    const base = `/${tab || 'home'}/card/${encodeId(overlay.company.id)}/profile`
    return overlay.postIndex != null ? `${base}/${overlay.postIndex}` : base
  }
  if (overlay?.type === 'gate') {
    const id = overlay.company?.id
    return id ? `/${tab || 'home'}/card/${encodeId(id)}/gate` : `/${tab || 'home'}/gate`
  }
  if (overlay?.type === 'own-photo') return '/profile/photo'
  if (overlay?.type === 'own-post') return `/profile/post/${overlay.postIndex}`
  if (overlay?.type === 'buy-system') return '/settings/buy'
  if (overlay?.type === 'live-link') return '/profile/live'
  if (overlay?.type === 'add-media') return '/profile/add'
  if (overlay?.type === 'best-selling-plans') return '/profile/best-selling-plans'
  if (overlay?.type === 'compose') return '/profile/compose'
  if (overlay?.type === 'feature-ecocash') return '/profile/feature-pay'
  if (tab === 'settings' && settingsView && settingsView !== 'home') {
    return `/settings/${encodeURIComponent(settingsView)}`
  }
  return `/${tab || 'home'}`
}

const parseHashPath = (path, findCompany) => {
  const parts = String(path || '/home')
    .split('/')
    .filter(Boolean)
  const [a, b, c, d, e] = parts

  if (a === 'site' && b) {
    return {
      tab: 'home',
      settingsView: 'home',
      overlay: null,
      route: {
        kind: 'site',
        slug: decodeURIComponent(b),
        projectId: c ? decodeURIComponent(c) : '',
        view: d ? decodeURIComponent(d) : '',
      },
    }
  }
  if (a === 'calc') {
    const panel = b || 'home'
    return {
      tab: 'home',
      settingsView: 'home',
      overlay: null,
      route: { kind: 'calc', panel },
    }
  }

  const tab = ['home', 'profile', 'settings', 'login'].includes(a) ? a : 'home'
  let settingsView = tab === 'settings' && b ? decodeURIComponent(b) : 'home'
  if (tab === 'settings' && (!b || b === 'card' || b === 'open' || b === 'add')) settingsView = 'home'
  let overlay = null

  if (b === 'card' && c) {
    const company = findCompany(decodeURIComponent(c))
    if (d === 'profile' && company) {
      let postIndex = null
      if (e === 'avatar') postIndex = 'avatar'
      else if (e !== undefined && e !== '' && Number.isFinite(Number(e))) postIndex = Number(e)
      overlay = { type: 'profile', company, postIndex }
    }
    else if (d === 'gate') overlay = { type: 'gate', company }
    else if (company) overlay = { type: 'gallery', company }
  } else if (a === 'profile' && b === 'photo') overlay = { type: 'own-photo' }
  else if (a === 'profile' && b === 'post' && c !== undefined) {
    overlay = { type: 'own-post', postIndex: Number(c) || 0 }
  }
  else if (a === 'profile' && b === 'live') overlay = { type: 'live-link' }
  else if (a === 'profile' && b === 'add') overlay = { type: 'add-media' }
  else if (a === 'profile' && b === 'best-selling-plans') overlay = { type: 'best-selling-plans' }
  else if (a === 'profile' && b === 'compose') overlay = { type: 'compose' }
  else if (a === 'profile' && b === 'feature-pay') overlay = { type: 'feature-ecocash' }
  else if (a === 'home' && b === 'gate') overlay = { type: 'gate' }

  return { tab, settingsView, overlay, route: { kind: '', slug: '' } }
}

const uniqueSlug = (name, accounts) => {
  const base = slugify(name)
  const taken = new Set(accounts.flatMap((account) => account.websites.map((site) => site.slug).filter(Boolean)))
  if (!taken.has(base)) return base
  let count = 2
  while (taken.has(`${base}-${count}`)) count += 1
  return `${base}-${count}`
}

const siteHref = (slug) => subdomainUrlFor(slug)

const slidesForSite = (site) => {
  const slides = [...(site?.slides || [])]
  const seen = new Set(slides.flatMap((slide) => [slide.photo, slide.video].filter(Boolean)))
  if (site?.profilePhoto && !seen.has(site.profilePhoto)) {
    slides.unshift({
      photo: site.profilePhoto,
      testimonial: '',
    })
    seen.add(site.profilePhoto)
  }
  ;(site?.gallery || []).forEach((photo, index) => {
    if (!photo || seen.has(photo)) return
    slides.push(
      isVideoSrc(photo)
        ? {
            video: photo,
            testimonial: site.photoCaptions?.[index] || site.testimonial || 'Site video from the company card.',
          }
        : {
            photo,
            testimonial: site.photoCaptions?.[index] || site.testimonial || 'Site photo from the company card.',
          },
    )
    seen.add(photo)
  })
  return slides
}

// Profile gallery grid must use the same merged media as home cards.
const gallerySlides = (site) => slidesForSite(site || {})

const firstSlide = (company) => company.slides?.[0] || null

const withVideoSlides = (company) => {
  if (!company) return company
  const slides = [...(company.slides || [])]
  const extraVideos = [
    ...(company.videos || []),
    ...(company.video ? [{ src: company.video, caption: company.videoCaption }] : []),
  ]
  extraVideos.forEach((clip) => {
    if (!clip?.src || slides.some((slide) => slide.video === clip.src)) return
    slides.splice(Math.min(1, slides.length), 0, {
      video: clip.src,
      testimonial: clip.caption || 'Ten-second clip from the company card.',
    })
  })
  return slides === company.slides ? company : { ...company, slides }
}

const featureMedia = (companies) => {
  const seen = new Set()
  const items = []

  companies.forEach((company) => {
    const photos = (company.slides || []).filter((slide) => slide.photo)
    const poster = photos[0]?.photo || ''
    const push = (kind, src, caption) => {
      if (!src || seen.has(src)) return
      seen.add(src)
      items.push({ company, kind, src, poster: kind === 'video' ? poster : '', caption })
    }

    if (company.featurePhotos) {
      const limit = Number.isFinite(company.featurePhotoCount) ? company.featurePhotoCount : photos.length
      photos.slice(0, Math.max(limit, 0)).forEach((slide) => push('photo', slide.photo, slide.testimonial))
      return
    }

    if (company.video) {
      push('video', company.video, company.videoCaption)
      return
    }

    if (photos[0]) push('photo', photos[0].photo, photos[0].testimonial)
  })

  return items
}

function GoldStar({ rating }) {
  if (rating < 4.8) return null
  return (
    <span className="gold-star" aria-label="Rated 4.8 or higher">
      ★
    </span>
  )
}

function StarRanking({ rating }) {
  const value = Number(rating) || 0
  const filled = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <p className="star-ranking" aria-label={`Rated ${value.toFixed(1)} of 5`}>
      <span className="star-ranking-value">{value.toFixed(1)}</span>
      <span className="star-ranking-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= filled ? 'star on' : 'star'}>
            ★
          </span>
        ))}
      </span>
    </p>
  )
}

const displayLivePath = (site) => {
  if (!site?.slug) return ''
  if (site.systemType === 'fabrication') return site.slug ? `#/site/${site.slug}` : '#/calc'
  return subdomainLabelFor(site)
}

const liveDomain = (site) => {
  if (!site) return ''
  return subdomainLabelFor(site)
}

const ceoFigures = (name = '') => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 33 + name.charCodeAt(i)) >>> 0
  const pick = (mod, base) => base + (hash % mod)
  return {
    sites: pick(6, 3),
    valuation: pick(80, 40) * 1000,
    sheq: pick(12, 4),
    stock: pick(20, 8),
    consumed: pick(15, 5),
    sales: pick(90, 20) * 100,
  }
}

const PRICING_KEY = 'fortress-fab-pricing-v5'
const emptyFabPricing = () => ({
  // Gate / small job rates
  tube50PerM: '4.50',
  tube25PerM: '2.20',
  tube16PerM: '1.60',
  tube76PerM: '12.00',
  angle30PerM: '2.80',
  angle40PerM: '3.20',
  flatBarPerM: '1.40',
  uChannelPerM: '8.00',
  sheetPerM2: '12.00',
  // Structure schedule rates (S-201 style)
  h120PerM: '18',
  pfc150PerM: '14',
  lc125PerM: '6.50',
  lc100PerM: '5.20',
  angle50PerM: '3.50',
  platePerKg: '1.80',
  boltM16: '1.20',
  boltM16_88: '1.20',
  boltM12: '0.80',
  ibrPerM2: '12.00',
  foundationPad: '45',
  lc150PerM: '7.50',
  // D01/D02 RC column QS rates (Zim)
  ...RC_COLUMN_DEFAULT_RATES,
  labourPercent: '65',
  consumablesPercent: '15',
  marginPercent: '30',
  transportPercent: DEFAULT_BOQ_PERCENTS.transportPercent,
  whatsapp: '',
  visionProvider: 'tesseract',
})
const emptyDrawingDraft = () => ({
  photo: '',
  name: '',
  gateType: '',
  design: '',
  gateId: '',
  complexity: '',
  construction: '',
  barInterval: '',
  spacing: String(FAB_DEFAULT_SPACING),
  infillMaterial: '',
  palisadeGap: '',
  tubeDiameter: '',
  width: '',
  height: '',
  qty: '1',
  qty50: '',
  qty25: '',
  qtyBeam: '',
  qtySheet: '',
  labourPercent: '',
  consumablesPercent: '',
  marginPercent: '',
})

const emptyProject = () => ({
  id: '',
  name: '',
  client: '',
  jobType: '',
  drawing: '',
  drawingName: '',
  drawingFingerprint: '',
  drawingKind: '',
  drawingType: '',
  drawingSource: '',
  natureKey: '',
  drawingScript: '',
  confirmNotes: '',
  descriptionConfirmed: false,
  planKind: '',
  gate: emptyDrawingDraft(),
  palisade: emptyPalisadeDraft(),
  burglar: emptyBurglarDraft(),
  schedule: [],
  rcStoreys: [],
  roofLength: '',
  roofWidth: '',
  wallArea: '',
  foundationPads: '',
  labourPercent: '',
  consumablesPercent: '',
  marginPercent: '',
  transportPercent: '',
  quoteTotal: 0,
  at: 0,
})

const loadDrawingTemplates = () => {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(storage.getItem(FAB_DRAWING_TEMPLATES_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

const saveDrawingTemplates = (rows) => {
  try {
    storage.setItem(FAB_DRAWING_TEMPLATES_KEY, JSON.stringify(rows.slice(0, 40)))
  } catch {
    /* ignore quota */
  }
}

const fingerprintFile = async (file) => {
  const buffer = await file.arrayBuffer()
  if (window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', buffer)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let hash = 0
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 1) hash = (hash * 31 + bytes[i]) >>> 0
  return `${file.name}-${file.size}-${hash}`
}

const findDrawingTemplate = (fingerprint) =>
  loadDrawingTemplates().find((item) => item.fingerprint === fingerprint) || null

const rememberDrawingTemplate = (project, pricingSnapshot = null) => {
  if (!project?.drawingFingerprint || !project.jobType) return
  const natureKey =
    project.natureKey ||
    drawingNatureKey({
      drawingType: project.drawingType,
      building: {
        length_m: project.roofLength,
        width_m: project.roofWidth,
      },
      schedule: project.schedule,
    })
  const template = {
    id: project.drawingFingerprint,
    fingerprint: project.drawingFingerprint,
    fileName: project.drawingName || 'drawing',
    drawingKind: project.drawingKind || '',
    drawingType: project.drawingType || '',
    drawingSource: project.drawingSource || '',
    natureKey,
    preview: project.drawingKind === 'image' && project.drawing ? project.drawing : '',
    jobType: project.jobType,
    gate: project.jobType === 'gate' ? { ...(project.gate || {}) } : null,
    schedule: isScheduleJob(project.jobType)
      ? JSON.parse(JSON.stringify(project.schedule || []))
      : null,
    rcStoreys: project.jobType === 'rc_columns' ? JSON.parse(JSON.stringify(project.rcStoreys || [])) : [],
    drawingScript: project.drawingScript || '',
    confirmNotes: project.confirmNotes || '',
    roofLength: project.roofLength,
    roofWidth: project.roofWidth,
    wallArea: project.wallArea,
    foundationPads: project.foundationPads,
    label: project.name || project.drawingName || 'Saved drawing formula',
    at: Date.now(),
  }
  // Avoid storing huge previews twice — keep a short flag if preview too large
  if (template.preview && template.preview.length > 400000) template.preview = ''
  const next = [template, ...loadDrawingTemplates().filter((item) => item.fingerprint !== template.fingerprint)]
  saveDrawingTemplates(next)
  if (isScheduleJob(project.jobType) && pricingSnapshot) {
    rememberNaturePrices({
      natureKey,
      drawingType: project.drawingType || (project.jobType === 'rc_columns' ? 'rc_columns' : 'steel_structure'),
      label: template.label,
      pricing: pricingSnapshot,
      schedule: project.schedule || [],
      building: {
        length_m: Number(project.roofLength) || null,
        width_m: Number(project.roofWidth) || null,
      },
    })
  }
}

/** Exact fingerprint only — never reuse another drawing's nature before this file is read. */
const findSimilarDrawingTemplate = (fingerprint) => {
  const exact = findDrawingTemplate(fingerprint)
  if (exact) return { ...exact, match: 'exact' }
  return null
}

const loadFabPricing = () => {
  if (typeof window === 'undefined') return emptyFabPricing()
  try {
    const saved = { ...emptyFabPricing(), ...JSON.parse(storage.getItem(PRICING_KEY) || '{}') }
    if (saved.visionProvider === 'openai') saved.visionProvider = 'gemini'
    if (!saved.visionProvider) saved.visionProvider = 'tesseract'
    delete saved.visionApiKey
    return saved
  } catch {
    return emptyFabPricing()
  }
}

const loadFabQuotes = () => {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(storage.getItem(FAB_QUOTES_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

const loadFabProjects = () => {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(storage.getItem(FAB_PROJECTS_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

const saveFabProjects = (rows) => {
  try {
    storage.setItem(FAB_PROJECTS_KEY, JSON.stringify(rows))
  } catch {
    /* ignore */
  }
}

const structureQuote = (project, pricing = emptyFabPricing()) => {
  if (!project || project.jobType !== 'structure') return null
  const labourPercent = pickPercent(project, 'labourPercent', pricing.labourPercent)
  const consumablesPercent = pickPercent(project, 'consumablesPercent', pricing.consumablesPercent)
  const marginPercent = pickPercent(project, 'marginPercent', pricing.marginPercent)
  const lines = (project.schedule || []).map((row) => {
    const rate = moneyAmount(pricing[row.priceKey])
    let amount = 0
    let detail = ''
    if (row.unit === 'm') {
      const meters = moneyAmount(row.meters)
      amount = meters * rate
      detail = `${meters.toFixed(2)}m × ${formatPrice(rate)}/m`
    } else if (row.unit === 'kg') {
      const qty = moneyAmount(row.qty)
      const kgEach = moneyAmount(row.kgEach) || 3.14
      const kg = qty * kgEach
      amount = kg * rate
      detail = `${qty} pcs · ${kg.toFixed(1)}kg × ${formatPrice(rate)}/kg`
    } else {
      const qty = moneyAmount(row.qty)
      amount = qty * rate
      detail = `${qty} pcs × ${formatPrice(rate)}`
    }
    return {
      name: `${row.role}${row.mark ? ` ${row.mark}` : ''} · ${row.section}`,
      detail,
      cost: amount,
      raw: amount,
    }
  })
  const roofL = moneyAmount(project.roofLength)
  const roofW = moneyAmount(project.roofWidth)
  const wallArea = moneyAmount(project.wallArea)
  const roofArea = roofL * roofW
  const ibrArea = roofArea + wallArea
  const ibrRate = moneyAmount(pricing.ibrPerM2 || pricing.sheetPerM2)
  if (ibrArea > 0) {
    lines.push({
      name: 'IBR Sheets (roof + walls)',
      detail: `${ibrArea.toFixed(2)} sqm`,
      cost: ibrArea * ibrRate,
      raw: ibrArea * ibrRate,
    })
  }
  const pads = moneyAmount(project.foundationPads)
  const padRate = moneyAmount(pricing.foundationPad)
  if (pads > 0) {
    lines.push({
      name: 'Foundation F1 Pads',
      detail: `${pads} pads`,
      cost: pads * padRate,
      raw: pads * padRate,
    })
  }
  const steelSum = lines.reduce((sum, line) => sum + line.raw, 0)
  const materials = steelSum * FAB_STEEL_WASTE
  const labour = materials * (labourPercent / 100)
  const consumables = materials * (consumablesPercent / 100)
  const subtotal = materials + labour + consumables
  const margin = subtotal * (marginPercent / 100)
  const total = subtotal + margin
  return {
    kind: 'structure',
    title: project.name || 'Steel structure',
    client: project.client,
    lines: lines.map((line) => ({ ...line, cost: line.cost })),
    steelSum,
    wasteFactor: FAB_STEEL_WASTE,
    materials,
    labour,
    consumables,
    subtotal,
    margin,
    labourPercent,
    consumablesPercent,
    marginPercent,
    roofArea,
    wallArea,
    ibrArea,
    total,
    quote: total,
  }
}

const moneyAmount = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const stockCuts = (meters) => {
  if (!(meters > 0)) return { meters: 0, lengths: 0, label: '0m' }
  const lengths = Math.max(1, Math.ceil(meters / FAB_STOCK))
  return {
    meters,
    lengths,
    label: `${meters.toFixed(1)}m (${lengths} length${lengths === 1 ? '' : 's'} of ${FAB_STOCK}m)`,
  }
}

const pickQty = (draft, key, computed) => {
  const raw = draft[key]
  if (raw === '' || raw == null) return computed
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : computed
}

const pickPercent = (draft, key, fallback) => {
  const raw = draft[key]
  if (raw === '' || raw == null) return moneyAmount(fallback)
  return moneyAmount(raw)
}

/**
 * L = W + 0.4 for sliding, else W.
 * Swing double: each leaf = L/2.
 * frame_50 = (2L)+(2H)+(3H)+L
 * count_25 = round(L/S); length_25 = count*(H-0.1)*1.1
 */
const calculateGate = (W, H, gateType, design, spacing = FAB_DEFAULT_SPACING) => {
  const openingL = gateType === 'sliding' ? W + FAB_OVERLAP : W
  const leaves = gateType === 'swing-double' ? 2 : 1
  const leafL = gateType === 'swing-double' ? openingL / 2 : openingL
  const S = spacing > 0 ? spacing : FAB_DEFAULT_SPACING
  const middleVerticals = FAB_MIDDLE_VERTICALS
  const frame50One = leafL * 2 + H * 2 + middleVerticals * H + leafL
  // User examples: 4.4/1.0 → 4 bars, 4.4/0.12 → 36 bars
  const barCountOne = Math.floor(leafL / S + 1e-9)
  const barClearH = Math.max(0, H - FAB_BAR_CLEARANCE)
  const sheetH = Math.min(FAB_HALF_SHEET_H, H)
  const topH = Math.max(0, H - sheetH)
  let tube25One = 0
  let sheetOne = 0
  if (design === 'palisade') {
    tube25One = barCountOne * barClearH * FAB_TUBE_WASTAGE
  } else if (design === 'solid') {
    sheetOne = leafL * H
  } else if (design === 'half') {
    sheetOne = leafL * sheetH
    tube25One = barCountOne * topH * FAB_TUBE_WASTAGE
  }
  const uChannel = gateType === 'sliding' ? openingL : 0
  return {
    L: openingL,
    leafL,
    leaves,
    spacing: S,
    middleVerticals,
    barCount: barCountOne * leaves,
    sheetH,
    topH,
    computed50: frame50One * leaves,
    computed25: tube25One * leaves,
    computedSheet: sheetOne * leaves,
    computedBeam: uChannel,
    sheetLength: (sheetOne * leaves) / FAB_SHEET_WIDTH,
  }
}

const fabQuote = (draft, pricing = emptyFabPricing()) => {
  const W = Number(draft.width)
  const H = Number(draft.height || draft.length)
  if (!(W > 0) || !(H > 0) || !draft.gateType || !draft.design) return null
  const type = FAB_CALC_TYPES.find((item) => item.id === draft.gateType)
  const design = FAB_CALC_DESIGNS.find((item) => item.id === draft.design)
  const spacing = Number(draft.spacing)
  const built = calculateGate(W, H, draft.gateType, draft.design, spacing > 0 ? spacing : FAB_DEFAULT_SPACING)
  const total50 = pickQty(draft, 'qty50', built.computed50)
  const tube25 = pickQty(draft, 'qty25', built.computed25)
  const sheetArea = pickQty(draft, 'qtySheet', built.computedSheet)
  const beam = pickQty(draft, 'qtyBeam', built.computedBeam)
  const tube50Rate = moneyAmount(pricing.tube50PerM)
  const tube25Rate = moneyAmount(pricing.tube25PerM)
  const beamRate = moneyAmount(pricing.uChannelPerM)
  const sheetRate = moneyAmount(pricing.sheetPerM2)
  const labourPercent = pickPercent(draft, 'labourPercent', pricing.labourPercent)
  const consumablesPercent = pickPercent(draft, 'consumablesPercent', pricing.consumablesPercent)
  const marginPercent = pickPercent(draft, 'marginPercent', pricing.marginPercent)
  const cost50 = total50 * tube50Rate
  const cost25 = tube25 * tube25Rate
  const costBeam = beam * beamRate
  const costSheet = sheetArea * sheetRate
  const materials = cost50 + cost25 + costBeam + costSheet
  const labour = materials * (labourPercent / 100)
  const consumables = materials * (consumablesPercent / 100)
  const subtotal = materials + labour + consumables
  const margin = subtotal * (marginPercent / 100)
  const total = subtotal + margin
  const hardwareLabel =
    draft.gateType === 'sliding'
      ? 'Track, 2 Rollers, Stopper'
      : draft.gateType === 'swing-double'
        ? '4 Hinges, 2 Drop bolts, Lock'
        : '2 Hinges, Drop bolt, Lock'
  const lines = [
    { name: '50x50x2mm Tube', detail: stockCuts(total50).label, cost: cost50 },
    tube25 > 0 ? { name: '25x25mm Tube', detail: stockCuts(tube25).label, cost: cost25 } : null,
    beam > 0 ? { name: 'U-Channel 80x40', detail: stockCuts(beam).label, cost: costBeam } : null,
    sheetArea > 0
      ? {
          name: 'IBR Sheet',
          detail: `${sheetArea.toFixed(1)} sqm`,
          cost: costSheet,
        }
      : null,
  ].filter(Boolean)
  return {
    W,
    H,
    L: built.L,
    leafL: built.leafL,
    leaves: built.leaves,
    type,
    design,
    title: `${built.L.toFixed(1)}m x ${H.toFixed(1)}m - ${design?.title || 'Design'}`,
    computed50: built.computed50,
    computed25: built.computed25,
    computedBeam: built.computedBeam,
    computedSheet: built.computedSheet,
    total50,
    tube25,
    beam,
    sheetArea,
    sheetLength: sheetArea / FAB_SHEET_WIDTH,
    spacing: built.spacing,
    palisadeCount: built.barCount,
    middleVerticals: built.middleVerticals,
    hardwareLabel,
    cost50,
    cost25,
    costBeam,
    costSheet,
    materials,
    labour,
    consumables,
    subtotal,
    margin,
    labourPercent,
    consumablesPercent,
    marginPercent,
    total,
    quote: total,
    lines,
  }
}

function MenuButton({ item, active, onSelect, className }) {
  const Icon = NAV_ICONS[item.id]
  return (
    <button
      type="button"
      className={className}
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(item.id)}
    >
      {Icon ? <Icon /> : null}
      <span>{item.label}</span>
    </button>
  )
}

function FeatureFlip({ companies, onOpen }) {
  const companyKey = companies.map((company) => company.id).join('|')
  const media = useMemo(() => featureMedia(companies), [companyKey])
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const videoRef = useRef(null)
  const count = media.length

  const go = (step) => {
    if (count < 2) return
    const nextDir = step >= 0 ? 1 : -1
    setDir(nextDir)
    setIndex((current) => current + nextDir)
  }

  useEffect(() => {
    setIndex(0)
    setDir(1)
  }, [companyKey])

  useEffect(() => {
    if (count < 2) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const activeIndex = ((index % count) + count) % count
    const current = media[activeIndex]
    const wait = current?.kind === 'video' ? VIDEO_SECONDS * 1000 : 8000
    const timer = window.setTimeout(() => {
      setDir(1)
      setIndex((currentIndex) => currentIndex + 1)
    }, wait)
    return () => window.clearTimeout(timer)
  }, [companyKey, index, count, media])

  useEffect(() => {
    const node = videoRef.current
    if (!node) return undefined
    node.currentTime = 0
    const play = node.play()
    if (play?.catch) play.catch(() => {})
    const limit = () => {
      if (node.currentTime >= VIDEO_SECONDS) node.pause()
    }
    node.addEventListener('timeupdate', limit)
    return () => {
      node.pause()
      node.removeEventListener('timeupdate', limit)
    }
  }, [index])

  if (!media.length) return null

  const active = ((index % count) + count) % count
  const visible = media[active] || media[0]
  const visibleCompany = visible.company
  const slideOffset = (slideIndex) => {
    let delta = slideIndex - active
    if (dir >= 0 && delta < 0) delta += count
    if (dir < 0 && delta > 0) delta -= count
    return delta
  }

  return (
    <div className="feature-card">
      <div className="feature-shot feature-shot-fill">
        {media.map((item, slideIndex) => (
          <div
            className="feature-slide"
            key={`${item.company.id}-${item.kind}-${slideIndex}`}
            style={{ transform: `translate3d(${slideOffset(slideIndex) * 100}%, 0, 0)` }}
          >
            {item.kind === 'video' ? (
              <video
                ref={slideIndex === active ? videoRef : null}
                src={item.src}
                poster={item.poster || undefined}
                muted
                playsInline
                autoPlay={slideIndex === active}
                preload={slideIndex === active ? 'auto' : 'metadata'}
              />
            ) : (
              <img src={item.src} alt="" />
            )}
          </div>
        ))}
        {media.length > 1 && (
          <>
            <button className="card-arrow left" type="button" aria-label="Previous" onClick={() => go(-1)}>
              ‹
            </button>
            <button className="card-arrow right" type="button" aria-label="Next" onClick={() => go(1)}>
              ›
            </button>
          </>
        )}
        <button
          className="feature-shot-hit"
          type="button"
          onClick={() => onOpen(visibleCompany, visible.src)}
          aria-label={visibleCompany.name}
        />
      </div>
      <button className="feature-meta" type="button" onClick={() => onOpen(visibleCompany, visible.src)}>
        <span className="store-logo" style={{ background: visibleCompany.hue }}>
          {visibleCompany.name.slice(0, 1)}
        </span>
        <div>
          <strong>{visibleCompany.name}</strong>
          <p>{visibleCompany.category}</p>
        </div>
        <GoldStar rating={visibleCompany.rating} />
      </button>
      {visible.caption ? <p className="feature-quote">{visible.caption}</p> : null}
    </div>
  )
}

function HomeTile({ company, onOpen }) {
  const slide = firstSlide(company)
  const reel = slide?.video || company.video
  return (
    <button type="button" className={`gallery-tile home-tile${reel ? ' is-reel' : ''}`} onClick={() => onOpen(company)}>
      {reel ? (
        <video src={reel} poster={slide?.photo || undefined} muted loop playsInline autoPlay />
      ) : slide?.photo ? (
        <img src={slide.photo} alt="" />
      ) : (
        <span className="home-tile-fallback" style={{ background: company.hue }}>
          {company.name.slice(0, 1)}
        </span>
      )}
      {reel ? <span className="reel-mark">Reel</span> : null}
      <span className="home-tile-name">{company.name}</span>
    </button>
  )
}

function PhaseSeal({ kicker, title, message }) {
  return (
    <div className="phase-seal" role="status">
      <span className="phase-seal-drops" aria-hidden="true" />
      <span className="phase-seal-mark">Sealed</span>
      {kicker ? <p className="phase-seal-kicker">{kicker}</p> : null}
      <p className="phase-seal-title">{title}</p>
      <p className="phase-seal-copy">{message}</p>
    </div>
  )
}

function CommentThread({ targetId, comments, viewer, onAdd, onReply, onNeedAccount }) {
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [replyDraft, setReplyDraft] = useState('')
  const thread = comments[targetId] || []

  const submit = (event) => {
    event.preventDefault()
    if (!viewer) {
      onNeedAccount?.()
      return
    }
    const text = draft.trim()
    if (!text) return
    onAdd(targetId, text)
    setDraft('')
  }

  const submitReply = (event, commentId) => {
    event.preventDefault()
    if (!viewer) {
      onNeedAccount?.()
      return
    }
    const text = replyDraft.trim()
    if (!text) return
    onReply(targetId, commentId, text)
    setReplyTo('')
    setReplyDraft('')
  }

  return (
    <div className="comment-thread">
      <h4>Comments</h4>
      {thread.length ? (
        thread.map((comment) => (
          <article className="comment-item" key={comment.id}>
            <strong>{comment.author}</strong>
            <p>{comment.text}</p>
            {(comment.replies || []).map((reply) => (
              <div className="comment-reply" key={reply.id}>
                <strong>{reply.author}</strong>
                <p>{reply.text}</p>
              </div>
            ))}
            {viewer ? (
              replyTo === comment.id ? (
                <form className="comment-form" onSubmit={(event) => submitReply(event, comment.id)}>
                  <input
                    type="text"
                    value={replyDraft}
                    placeholder="Reply"
                    onChange={(event) => setReplyDraft(event.target.value)}
                  />
                  <button type="submit">Send</button>
                </form>
              ) : (
                <button type="button" className="comment-reply-btn" onClick={() => setReplyTo(comment.id)}>
                  Reply
                </button>
              )
            ) : null}
          </article>
        ))
      ) : (
        <p className="empty-note">No comments yet.</p>
      )}
      {viewer ? (
        <form className="comment-form" onSubmit={submit}>
          <input
            type="text"
            value={draft}
            placeholder="Add a comment"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit">Post</button>
        </form>
      ) : (
        <button type="button" className="comment-reply-btn" onClick={() => onNeedAccount?.()}>
          Sign in to comment
        </button>
      )}
    </div>
  )
}

function IconLock() {
  return (
    <svg className="lock-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 9.2V7.4A5 5 0 0 0 7 7.4v1.8H5.2V20h13.6V9.2H17zM8.8 7.4a3.2 3.2 0 0 1 6.4 0v1.8H8.8V7.4zM12 15.8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
      />
    </svg>
  )
}

function SystemExplainCards({ system }) {
  const slides = system.slides?.length
    ? system.slides
    : (system.preview || []).map((photo) => ({ photo, testimonial: system.how }))
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const startX = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    setIndex(0)
    setDir(1)
  }, [system.id])

  const go = (step) => {
    if (count < 2) return
    const nextDir = step >= 0 ? 1 : -1
    setDir(nextDir)
    setIndex((current) => current + nextDir)
  }

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return
    dragging.current = true
    startX.current = event.clientX
  }

  const onPointerUp = (event) => {
    if (!dragging.current) return
    dragging.current = false
    const delta = event.clientX - startX.current
    if (delta <= -40) go(1)
    if (delta >= 40) go(-1)
  }

  const active = count ? ((index % count) + count) % count : 0
  const slide = slides[active]
  const slideOffset = (slideIndex) => {
    let delta = slideIndex - active
    if (dir >= 0 && delta < 0) delta += count
    if (dir < 0 && delta > 0) delta -= count
    return delta
  }

  if (!count) return <p className="shop-copy">{system.how}</p>

  return (
    <div className="explain-cards">
      <div
        className="explain-stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        {slides.map((entry, slideIndex) => (
          <div
            className="explain-slide"
            key={`${system.id}-explain-${slideIndex}`}
            style={{ transform: `translate3d(${slideOffset(slideIndex) * 100}%, 0, 0)` }}
          >
            {entry.video ? (
              <video src={entry.video} muted playsInline autoPlay={slideIndex === active} controls={false} />
            ) : (
              <img src={entry.photo} alt="" />
            )}
          </div>
        ))}
        {count > 1 ? (
          <>
            <button
              className="card-arrow left"
              type="button"
              aria-label="Previous"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                go(-1)
              }}
            >
              ‹
            </button>
            <button
              className="card-arrow right"
              type="button"
              aria-label="Next"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                go(1)
              }}
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      <p className="explain-count">{active + 1} / {count}</p>
      <p className="explain-copy">{slide?.testimonial || system.how}</p>
    </div>
  )
}

function OpenedCard({
  company,
  onClose,
  onViewProfile,
  startIndex = 0,
  comments,
  onAddComment,
  onReplyComment,
  viewer,
  onNeedAccount,
  canDelete,
  onDelete,
  canEditCaption,
  onCaptionChange,
  commentIndex,
}) {
  const slides = company.slides || []
  const count = slides.length
  const [index, setIndex] = useState(() => Number(startIndex) || 0)
  const [dir, setDir] = useState(1)
  const startX = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    setIndex(Number(startIndex) || 0)
    setDir(1)
  }, [company.id, startIndex])

  const go = (step) => {
    if (count < 2) return
    const nextDir = step >= 0 ? 1 : -1
    setDir(nextDir)
    setIndex((current) => current + nextDir)
  }

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return
    dragging.current = true
    startX.current = event.clientX
  }

  const onPointerUp = (event) => {
    if (!dragging.current) return
    dragging.current = false
    const delta = event.clientX - startX.current
    if (delta <= -40) go(1)
    if (delta >= 40) go(-1)
  }

  const active = count ? ((index % count) + count) % count : 0
  const slide = slides[active]
  const slideOffset = (slideIndex) => {
    let delta = slideIndex - active
    if (dir >= 0 && delta < 0) delta += count
    if (dir < 0 && delta > 0) delta -= count
    return delta
  }

  return (
    <section
      className="detail-sheet opened-sheet"
      aria-label={company.name}
      onClick={onClose}
    >
      <div className="opened-card" onClick={(event) => event.stopPropagation()}>
        <div
          className={company.nativeFrame ? 'opened-stage opened-stage-fill' : 'opened-stage'}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragging.current = false
          }}
        >
          <button
            type="button"
            className="card-x"
            aria-label="Close"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onClose()
            }}
          >
            ×
          </button>
          {canDelete ? (
            <button
              type="button"
              className="card-delete-fab"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onDelete?.(active)
              }}
            >
              Delete
            </button>
          ) : null}
          {slides.map((entry, slideIndex) => (
            <div
              className="opened-slide"
              key={`${company.id}-open-${slideIndex}`}
              style={{ transform: `translate3d(${slideOffset(slideIndex) * 100}%, 0, 0)` }}
            >
              {entry.video ? (
                <video src={entry.video} muted playsInline autoPlay={slideIndex === active} controls={false} />
              ) : entry.photo ? (
                <img src={entry.photo} alt={`${company.name} photo ${slideIndex + 1}`} />
              ) : null}
            </div>
          ))}
          {count > 1 && (
            <>
              <button
                className="card-arrow left"
                type="button"
                aria-label="Previous"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  go(-1)
                }}
              >
                ‹
              </button>
              <button
                className="card-arrow right"
                type="button"
                aria-label="Next"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  go(1)
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
        <div className="opened-copy">
          {company.shelf ? <p className="card-class">{company.shelf}</p> : null}
          <h2>{company.name}</h2>
          <p className="opened-count">
            {count ? `${active + 1} / ${count}` : '0 / 0'}
          </p>
          {canEditCaption && onCaptionChange ? (
            <label className="card-caption-edit">
              Testimonial caption
              <textarea
                rows="3"
                value={slide?.testimonial || ''}
                placeholder="Write a testimonial caption, or leave blank"
                onChange={(event) => onCaptionChange(active, event.target.value)}
              />
            </label>
          ) : slide?.testimonial ? (
            <p className="detail-quote card-caption">{slide.testimonial}</p>
          ) : count ? null : (
            <p className="empty-note">No photos yet.</p>
          )}
        </div>
        {onViewProfile ? (
          <div className="card-actions opened-actions">
            <button className="view-profile-button" type="button" onClick={onViewProfile}>
              View profile
            </button>
          </div>
        ) : null}
        {comments && onAddComment ? (
          <CommentThread
            targetId={`photo:${company.id}:${commentIndex ?? active}`}
            comments={comments}
            viewer={viewer}
            onAdd={onAddComment}
            onReply={onReplyComment}
            onNeedAccount={onNeedAccount}
          />
        ) : null}
      </div>
    </section>
  )
}

function CeoDashboard({
  site,
  onBack,
  backLabel = '← Fortress',
  embedded = false,
  initialProjectId = '',
  initialView = 'home',
  onMetadataUpdated,
}) {
  const meta = getSiteCeoMetadata(site)
  const isManufacturing = site?.systemType === 'manufacturing' || meta?.template === 'prixburg'
  const content = isManufacturing ? (
    <PrixburgTemplate
      site={site}
      initialProjectId={initialProjectId}
      initialView={initialView}
      onBack={onBack}
      backLabel={backLabel}
      onMetadataUpdated={onMetadataUpdated}
    />
  ) : (
    <RodcroftTemplate
      site={site}
      initialProjectId={initialProjectId}
      initialView={initialView}
      onBack={onBack}
      backLabel={backLabel}
      onMetadataUpdated={onMetadataUpdated}
    />
  )
  if (embedded) return <div className="ceo-embedded">{content}</div>
  return content
}

function HistoryNav({ className = '', onBack, onForward, canBack = false, canForward = false }) {
  return (
    <div className={`history-nav ${className}`.trim()}>
      <button
        type="button"
        className="history-nav-btn"
        aria-label="Go back"
        disabled={!onBack || canBack === false}
        onClick={() => onBack?.()}
      >
        ←
      </button>
      <button
        type="button"
        className="history-nav-btn"
        aria-label="Go forward"
        disabled={!onForward || canForward === false}
        onClick={() => onForward?.()}
      >
        →
      </button>
    </div>
  )
}

const calcPanelFromState = (view, step) => {
  if (view === 'pricing') return 'list'
  if (view === 'subscriptions') return 'subs'
  if (view === 'documents') return 'docs'
  if (step === 1) return 'new'
  if (step === 2) return 'drawing'
  if (step === 3) return 'confirm'
  if (step === 4) return 'prices'
  if (step === 5) return 'quote'
  return 'home'
}

const calcStateFromPanel = (panel = 'home') => {
  if (panel === 'list') return { view: 'pricing', step: 0 }
  if (panel === 'subs') return { view: 'subscriptions', step: 0 }
  if (panel === 'docs') return { view: 'documents', step: 0 }
  if (panel === 'new') return { view: 'home', step: 1 }
  if (panel === 'drawing') return { view: 'home', step: 2 }
  if (panel === 'confirm') return { view: 'home', step: 3 }
  if (panel === 'prices') return { view: 'home', step: 4 }
  if (panel === 'quote') return { view: 'home', step: 5 }
  return { view: 'home', step: 0 }
}

function FabMenuIcon({ name }) {
  const paths = {
    home: ['M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3z'],
    subscriptions: ['M4 7h16v10H4z', 'M4 11h16', 'M8 15h4'],
    documents: ['M7 3h7l5 5v13H7z', 'M14 3v5h5'],
    pricing: ['M12 3v18', 'M16.5 7.5H10a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H7'],
  }
  return (
    <svg className="fab-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {(paths[name] || []).map((d) => (
        <path key={d} fill="currentColor" d={d} />
      ))}
    </svg>
  )
}

function FabTypeIcon({ name }) {
  if (name === 'swing-double') {
    return (
      <svg className="fab-card-icon" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="8" width="16" height="32" rx="2" />
        <rect x="26" y="8" width="16" height="32" rx="2" />
        <path d="M14 24h8M26 24h8" />
      </svg>
    )
  }
  if (name === 'swing-single') {
    return (
      <svg className="fab-card-icon" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="14" y="8" width="20" height="32" rx="2" />
        <circle cx="16" cy="24" r="2" />
        <path d="M34 16v16" />
      </svg>
    )
  }
  return (
    <svg className="fab-card-icon" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="10" width="28" height="24" rx="2" />
      <path d="M8 38h36M14 38v-4M24 38v-4M34 38v-4" />
    </svg>
  )
}

function FabDesignImage({ name }) {
  if (name === 'solid') {
    return (
      <svg className="fab-design-art" viewBox="0 0 220 120" aria-hidden="true">
        <rect x="18" y="14" width="184" height="92" rx="6" fill="#6b645c" />
        {[28, 48, 68, 88, 108].map((y) => (
          <path key={y} d={`M22 ${y} q18 -8 36 0 t36 0 t36 0 t36 0`} fill="none" stroke="#d7cfc4" strokeWidth="3" />
        ))}
      </svg>
    )
  }
  if (name === 'half') {
    return (
      <svg className="fab-design-art" viewBox="0 0 220 120" aria-hidden="true">
        <rect x="18" y="14" width="184" height="92" rx="6" fill="#fff" stroke="#1c1915" />
        {[40, 62, 84, 106, 128, 150, 172].map((x) => (
          <rect key={x} x={x} y="18" width="8" height="42" fill="#1c1915" />
        ))}
        <rect x="22" y="62" width="176" height="40" fill="#6b645c" />
      </svg>
    )
  }
  return (
    <svg className="fab-design-art" viewBox="0 0 220 120" aria-hidden="true">
      <rect x="18" y="14" width="184" height="92" rx="6" fill="#fff" stroke="#1c1915" />
      {[40, 58, 76, 94, 112, 130, 148, 166].map((x) => (
        <rect key={x} x={x} y="20" width="8" height="80" fill="#1c1915" />
      ))}
    </svg>
  )
}

function DrawingPaper({ caption, children }) {
  return (
    <svg className="fab-drawing" viewBox="0 0 320 228" aria-hidden="true">
      <rect className="fab-drawing-sheet" x="6" y="6" width="308" height="216" rx="10" />
      <text className="fab-drawing-caption" x="18" y="24">
        {caption}
      </text>
      <line x1="36" y1="36" x2="284" y2="36" />
      <line x1="36" y1="32" x2="36" y2="40" />
      <line x1="284" y1="32" x2="284" y2="40" />
      <text x="160" y="34" textAnchor="middle">
        W
      </text>
      {children}
    </svg>
  )
}

function bars(xs, y1, y2, spear) {
  return xs.map((x) => (
    <g key={x}>
      <line x1={x} y1={y1} x2={x} y2={y2} />
      {spear ? <path d={`M${x - 6} ${y1} L${x} ${y1 - 14} L${x + 6} ${y1}`} /> : null}
    </g>
  ))
}

function scrolls(points) {
  return points.map(([x, y], index) => (
    <path key={`${x}-${y}-${index}`} d={`M${x} ${y} c12 -16 28 16 8 22 c-22 8 -18 -28 6 -22`} />
  ))
}

function GateEngineeringDrawing({ type, kind }) {
  const fancy = kind === 'laser'
  const mid = kind === 'medium' || fancy
  const caption =
    kind === 'laser' ? 'COMPLEX' : kind === 'medium' ? 'MEDIUM' : 'SIMPLE'

  const leaf = (x, w, y = 48, h = 132) => (
    <>
      <rect x={x} y={y} width={w} height={h} />
      <line x1={x} y1={y + 16} x2={x + w} y2={y + 16} />
      <line x1={x} y1={y + h - 16} x2={x + w} y2={y + h - 16} />
      {bars(
        Array.from({ length: Math.max(3, Math.round(w / 22)) }, (_, i) => x + 12 + i * (w / Math.max(3, Math.round(w / 22)))),
        y + 16,
        y + h - 16,
        mid,
      )}
      {fancy ? scrolls([[x + 18, y + 70], [x + w - 34, y + 88]]) : null}
    </>
  )

  if (type === 'swing') {
    return (
      <DrawingPaper caption={`SWING · ${caption}`}>
        <rect x="28" y="48" width="14" height="140" />
        <rect x="278" y="48" width="14" height="140" />
        {leaf(46, 110)}
        {leaf(164, 110)}
        <circle cx="46" cy="70" r="4" />
        <circle cx="46" cy="160" r="4" />
        <circle cx="274" cy="70" r="4" />
        <circle cx="274" cy="160" r="4" />
        <path d="M156 180 A70 36 0 0 1 46 196" />
        <path d="M164 180 A70 36 0 0 0 274 196" />
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          HINGE
        </text>
      </DrawingPaper>
    )
  }

  if (type === 'cantilever') {
    return (
      <DrawingPaper caption={`CANTILEVER · ${caption}`}>
        <rect x="40" y="48" width="14" height="132" />
        <rect x="118" y="48" width="14" height="132" />
        <rect x="54" y="56" width="230" height="116" />
        <line x1="54" y1="72" x2="284" y2="72" />
        <line x1="54" y1="156" x2="284" y2="156" />
        {bars([74, 98, 122, 146, 170, 194, 218, 242, 266], 72, 156, mid)}
        {fancy ? scrolls([[80, 100], [200, 118]]) : null}
        <rect x="54" y="56" width="70" height="116" className="fab-drawing-hatch" />
        <circle cx="47" cy="168" r="8" />
        <circle cx="125" cy="168" r="8" />
        <line x1="36" y1="188" x2="200" y2="188" />
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          ROLLERS · NO GROUND TRACK
        </text>
      </DrawingPaper>
    )
  }

  if (type === 'bifold') {
    return (
      <DrawingPaper caption={`BI-FOLD · ${caption}`}>
        <rect x="30" y="48" width="12" height="140" />
        <rect x="278" y="48" width="12" height="140" />
        <rect x="48" y="56" width="52" height="124" />
        <rect x="100" y="62" width="48" height="118" transform="rotate(-18 100 180)" />
        <rect x="172" y="62" width="48" height="118" transform="rotate(18 220 180)" />
        <rect x="220" y="56" width="52" height="124" />
        {mid ? bars([58, 72, 86], 72, 164, true) : bars([62, 82], 72, 164, false)}
        {fancy ? scrolls([[56, 110], [230, 118]]) : null}
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          FOLD
        </text>
      </DrawingPaper>
    )
  }

  if (type === 'telescopic') {
    return (
      <DrawingPaper caption={`TELESCOPIC · ${caption}`}>
        <rect x="36" y="54" width="90" height="120" />
        <rect x="86" y="62" width="90" height="112" />
        <rect x="136" y="70" width="90" height="104" />
        {fancy ? <rect x="186" y="78" width="80" height="96" /> : null}
        {bars([50, 70, 100, 120, 150, 170], 78, 160, mid)}
        {fancy ? scrolls([[148, 112]]) : null}
        <path d="M40 190 H250" />
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          LEAVES STACK
        </text>
      </DrawingPaper>
    )
  }

  if (type === 'pedestrian') {
    return (
      <DrawingPaper caption={`PEDESTRIAN · ${caption}`}>
        <rect x="88" y="44" width="16" height="148" />
        <rect x="216" y="44" width="16" height="148" />
        <rect x="104" y="52" width="112" height="132" />
        <line x1="104" y1="68" x2="216" y2="68" />
        <line x1="104" y1="168" x2="216" y2="168" />
        {bars([120, 138, 156, 174, 192], 68, 168, mid)}
        {fancy ? scrolls([[118, 108]]) : null}
        <circle cx="200" cy="118" r="7" />
        <line x1="104" y1="118" x2="200" y2="118" />
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          LATCH
        </text>
      </DrawingPaper>
    )
  }

  if (type === 'automatic') {
    return (
      <DrawingPaper caption={`AUTOMATIC · ${caption}`}>
        <rect x="28" y="50" width="18" height="128" />
        <rect x="46" y="58" width="200" height="112" />
        <line x1="46" y1="74" x2="246" y2="74" />
        <line x1="46" y1="154" x2="246" y2="154" />
        {bars([66, 90, 114, 138, 162, 186, 210, 232], 74, 154, mid)}
        {fancy ? scrolls([[70, 104], [180, 120]]) : null}
        <rect x="28" y="86" width="36" height="28" />
        <line x1="46" y1="170" x2="246" y2="170" />
        {[70, 100, 130, 160, 190, 220].map((x) => (
          <path key={x} d={`M${x} 170 L${x + 8} 176 L${x} 182`} />
        ))}
        <circle cx="40" cy="196" r="5" />
        <circle cx="250" cy="196" r="5" />
        <line x1="40" y1="196" x2="250" y2="196" />
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          MOTOR · RACK · BEAM
        </text>
      </DrawingPaper>
    )
  }

  if (type === 'wrought') {
    return (
      <DrawingPaper caption={`WROUGHT IRON · ${caption}`}>
        <rect x="40" y="52" width="12" height="136" />
        <rect x="268" y="52" width="12" height="136" />
        <path d="M52 58 Q160 18 268 58" />
        {leaf(52, 216, 58, 122)}
        <circle cx="100" cy="118" r="12" />
        <circle cx="160" cy="118" r="12" />
        <circle cx="220" cy="118" r="12" />
        {fancy ? scrolls([[70, 90], [140, 140], [210, 90]]) : mid ? scrolls([[90, 100], [190, 100]]) : null}
        <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
          SCROLLS · SPEARS
        </text>
      </DrawingPaper>
    )
  }

  return (
    <DrawingPaper caption={`SLIDING · ${caption}`}>
      <rect x="24" y="52" width="16" height="128" />
      <rect x="44" y="60" width="220" height="108" />
      <line x1="44" y1="76" x2="264" y2="76" />
      <line x1="44" y1="152" x2="264" y2="152" />
      {bars([64, 88, 112, 136, 160, 184, 208, 232, 252], 76, 152, mid)}
      {fancy ? scrolls([[72, 108], [190, 120]]) : null}
      <line x1="36" y1="176" x2="280" y2="176" />
      <line x1="36" y1="184" x2="280" y2="184" />
      <circle cx="70" cy="180" r="6" />
      <circle cx="130" cy="180" r="6" />
      <circle cx="190" cy="180" r="6" />
      <path d="M250 112 H290 M278 104 L290 112 L278 120" />
      <text className="fab-drawing-caption" x="160" y="216" textAnchor="middle">
        TRACK · ROLLERS
      </text>
    </DrawingPaper>
  )
}

function FabricationCalculator({
  site,
  draft,
  onChange,
  onSave,
  onRenew,
  onBack,
  backLabel = 'Fortress',
  pricing,
  onSavePricing,
  routePanel = 'home',
  initialProject = null,
  onNavigate,
  canHistoryBack = false,
  canHistoryForward = false,
  onHistoryBack,
  onHistoryForward,
}) {
  const initial = calcStateFromPanel(routePanel)
  const [view, setView] = useState(initial.view)
  const [step, setStep] = useState(initial.step)
  const [gateStep, setGateStep] = useState(1)
  const [planStep, setPlanStep] = useState(1)
  /** `drawing` | `plan_manual` (gates / palisade / burglar without a drawing). */
  const [pathMode, setPathMode] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [note, setNote] = useState('')
  const [priceForm, setPriceForm] = useState(() => ({ ...emptyFabPricing(), ...(pricing || {}) }))
  const [projects, setProjects] = useState(() => loadFabProjects())
  const [project, setProject] = useState(() => emptyProject())
  const [drawingViewer, setDrawingViewer] = useState(null)
  const [drawingNote, setDrawingNote] = useState('')
  const [objections, setObjections] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [master, setMaster] = useState(() => loadMasterTemplate())
  const [online, setOnline] = useState(true)
  const [freemiumNote, setFreemiumNote] = useState('')
  /** Kept so a job already started in this session can finish its steps. */
  const [freemiumConsumedForProject, setFreemiumConsumedForProject] = useState(false)
  const rates = { ...emptyFabPricing(), ...(pricing || {}), ...(priceForm || {}) }
  const trialActive = fabTrialActive(site)
  const subActive = fabSubscriptionActive(site) || trialActive
  const freeLeft = 0
  const canUseFreemiumJob = subActive
  const canUploadDrawing = canUseFreemiumJob
  const canStartGateQuote = canUseFreemiumJob

  const refreshDrawingScript = (proj) =>
    formatDrawingScript({
      drawingType: proj.drawingType,
      jobType: proj.jobType,
      roofLength: proj.roofLength,
      roofWidth: proj.roofWidth,
      wallArea: proj.wallArea,
      foundationPads: proj.foundationPads,
      gate: proj.gate,
      schedule: proj.schedule,
      notes: proj.confirmNotes || '',
      name: proj.name,
      client: proj.client,
      confirmNotes: proj.confirmNotes || '',
      rcStoreys: proj.rcStoreys,
    })

  useEffect(() => {
    const syncOnline = () => setOnline(readOnline())
    syncOnline()
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)
    return () => {
      window.removeEventListener('online', syncOnline)
      window.removeEventListener('offline', syncOnline)
    }
  }, [])

  const needOnline = (action) => {
    if (online || readOnline()) return false
    setDrawingNote(offlineActionMessage(action))
    setNote(offlineActionMessage(action))
    return true
  }

  const consumeFreeDrawingUpload = () => {
    if (subActive) {
      setFreemiumNote('')
      setFreemiumConsumedForProject(true)
      return { ok: true, left: null }
    }
    setFreemiumNote('The fabrication calculator is $100/month. Pay first, or use an active 14 day trial.')
    goView('subscriptions')
    return { ok: false, left: 0 }
  }

  const guardDrawingUpload = () => {
    if (subActive) return true
    setFreemiumNote('The fabrication calculator is $100/month. Pay first, or use an active 14 day trial.')
    goView('subscriptions')
    return false
  }

  const guardGateQuoteStart = () => {
    if (subActive) return true
    setFreemiumNote('The fabrication calculator is $100/month. Pay first, or use an active 14 day trial.')
    goView('subscriptions')
    return false
  }
  const gateDraft = { ...emptyDrawingDraft(), ...(project.gate || {}) }
  const gateQuote = project.jobType === 'gate' ? fabQuote({ ...gateDraft, ...project.gate }, rates) : null
  const structQuote = project.jobType === 'structure' ? structureQuote(project, rates) : null
  const rcQuote = project.jobType === 'rc_columns' ? rcColumnQuote(project, rates) : null
  const quote =
    project.jobType === 'structure' ? structQuote : project.jobType === 'rc_columns' ? rcQuote : gateQuote

  const navigatePanel = (panel, { replace = false } = {}) => {
    const next = calcStateFromPanel(panel)
    setView(next.view)
    setStep(next.step)
    setMenuOpen(false)
    onNavigate?.(panel === 'home' ? '/calc' : `/calc/${panel}`, { replace })
  }

  useEffect(() => {
    const next = calcStateFromPanel(routePanel || 'home')
    setView(next.view)
    setStep(next.step)
  }, [routePanel])

  const goView = (next) => {
    if (next === 'home') navigatePanel('home')
    else if (next === 'pricing') navigatePanel('list')
    else if (next === 'subscriptions') navigatePanel('subs')
    else if (next === 'documents') navigatePanel('docs')
  }

  const goStep = (nextStep) => navigatePanel(calcPanelFromState('home', nextStep))

  const updateProject = (patch) => setProject((prev) => ({ ...prev, ...patch }))

  const updateGate = (patch) => {
    const nextGate = { ...(project.gate || emptyDrawingDraft()), ...patch }
    updateProject({ gate: nextGate })
    onChange({ ...draft, ...nextGate, jobType: 'gate' })
  }

  const updateScheduleRow = (id, patch) => {
    updateProject({
      schedule: (project.schedule || []).map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
        // RC rebar: prefer Weight from the drawing table; only recompute if user edits length
        if (
          project.jobType === 'rc_columns' &&
          (next.group === 'steel' || /^Y\d+/i.test(next.section)) &&
          next.unit === 'kg'
        ) {
          const userEditedLength = patch.meters != null && patch.qty == null
          if (userEditedLength) next.weightFromDrawing = false
          return refreshRcSteelRow(next, moneyAmount(rates.rcWasteFactor) || 1.1, {
            recomputeWeight: userEditedLength,
          })
        }
        return next
      }),
    })
  }

  const persistProjects = (rows) => {
    setProjects(rows)
    saveFabProjects(rows)
  }

  const saveCurrentProject = (finalQuote) => {
    const entry = {
      ...project,
      id: project.id || makeId('proj'),
      quoteTotal: finalQuote?.total || 0,
      at: Date.now(),
      gate: project.jobType === 'gate' ? { ...(project.gate || {}), name: finalQuote?.title || project.name } : project.gate,
    }
    const next = [entry, ...projects.filter((item) => item.id !== entry.id)].slice(0, 24)
    persistProjects(next)
    rememberDrawingTemplate(entry, rates)
    setProject(entry)
    if (site?.id && project.jobType === 'gate') onSave?.()
    return entry
  }

  const startNewProject = () => {
    if (!subActive) {
      setFreemiumNote('The fabrication calculator is $100/month. Pay first, or use an active 14 day trial.')
      goView('subscriptions')
      return
    }
    setProject(emptyProject())
    onChange(emptyDrawingDraft())
    setNote('')
    setObjections('')
    setDrawingNote('')
    setGateStep(1)
    setPlanStep(1)
    setPathMode('')
    setFreemiumConsumedForProject(false)
    goStep(1)
  }

  const openProject = (item) => {
    const planKind =
      item.planKind ||
      (item.jobType === 'gate' || item.jobType === 'palisade' || item.jobType === 'burglar'
        ? item.jobType
        : '')
    setProject({
      ...emptyProject(),
      ...item,
      planKind,
      palisade: { ...emptyPalisadeDraft(), ...(item.palisade || {}) },
      burglar: { ...emptyBurglarDraft(), ...(item.burglar || {}) },
      schedule: item.schedule?.length ? item.schedule : [],
    })
    if (item.jobType === 'gate' && item.gate) onChange({ ...emptyDrawingDraft(), ...item.gate })
    setNote('')
    setObjections(item.confirmNotes || '')
    setGateStep(1)
    setPlanStep(1)
    if (item.drawing) {
      setPathMode('drawing')
      goStep(2)
      return
    }
    if (planKind) {
      setPathMode('plan_manual')
      goStep(5)
      return
    }
    setPathMode(item.drawing ? 'drawing' : 'plan_manual')
    goStep(5)
  }

  const openedLaunchRef = useRef('')
  useEffect(() => {
    if (!initialProject?.id || openedLaunchRef.current === initialProject.id) return
    openedLaunchRef.current = initialProject.id
    openProject(initialProject)
  }, [initialProject])

  const nextFromProject = (mode) => {
    if (!project.name.trim()) {
      setNote('Enter a project name.')
      return
    }
    setNote('')
    setGateStep(1)
    setPlanStep(0)
    if (mode === 'plan_manual' || mode === 'gate_manual') {
      if (!guardGateQuoteStart()) return
      if (!freemiumConsumedForProject) {
        const consumed = consumeFreeDrawingUpload()
        if (consumed?.ok === false) return
      }
      setPathMode('plan_manual')
      setProject((prev) => ({
        ...prev,
        planKind: '',
        jobType: '',
        drawingType: '',
        gate: { ...emptyDrawingDraft(), ...(prev.gate || {}) },
        palisade: { ...emptyPalisadeDraft(), ...(prev.palisade || {}) },
        burglar: { ...emptyBurglarDraft(), ...(prev.burglar || {}) },
        drawing: '',
        drawingName: '',
        drawingFingerprint: '',
        schedule: [],
      }))
      goStep(2)
      return
    }
    setPathMode('drawing')
    goStep(2)
  }

  const choosePlanKind = (kind) => {
    setNote('')
    setGateStep(1)
    setPlanStep(1)
    if (kind === 'gate') {
      const gate = { ...emptyDrawingDraft(), ...(project.gate || {}) }
      setProject((prev) => ({
        ...prev,
        planKind: 'gate',
        jobType: 'gate',
        drawingType: 'gate',
        gate,
      }))
      onChange(gate)
      return
    }
    if (kind === 'palisade') {
      setProject((prev) => ({
        ...prev,
        planKind: 'palisade',
        jobType: 'palisade',
        drawingType: 'palisade_fence',
        palisade: { ...emptyPalisadeDraft(), ...(prev.palisade || {}) },
      }))
      return
    }
    setProject((prev) => ({
      ...prev,
      planKind: 'burglar',
      jobType: 'burglar',
      drawingType: 'burglar_bars',
      burglar: { ...emptyBurglarDraft(), ...(prev.burglar || {}) },
    }))
  }

  const updatePalisade = (patch) => {
    setProject((prev) => ({
      ...prev,
      palisade: { ...emptyPalisadeDraft(), ...(prev.palisade || {}), ...patch },
    }))
  }

  const updateBurglar = (patch) => {
    setProject((prev) => ({
      ...prev,
      burglar: { ...emptyBurglarDraft(), ...(prev.burglar || {}), ...patch },
    }))
  }

  const nextFromDrawing = () => {
    if (!project.jobType) {
      setNote('Upload a drawing so the app can recognise the type.')
      return
    }
    if (project.jobType === 'gate') {
      const g = project.gate || {}
      if (!Number(g.width) || !Number(g.height)) {
        setNote('Confirm gate width and height.')
        return
      }
      if (!g.gateType) {
        setNote('Choose a gate type.')
        return
      }
      if (!g.design) {
        setNote('Choose a gate design.')
        return
      }
      if ((g.design === 'palisade' || g.design === 'half') && !(Number(g.spacing) > 0)) {
        setNote('Enter palisade spacing.')
        return
      }
    } else if (!(project.schedule || []).length) {
      setNote('Add materials from the drawing first (or re-read the plan).')
      return
    }
    const script = refreshDrawingScript(project)
    setProject((prev) => ({
      ...prev,
      drawingScript: script,
      descriptionConfirmed: false,
    }))
    setObjections(project.confirmNotes || '')
    setNote('')
    setDrawingNote('Review the take-off script. Object to anything wrong, then confirm before prices.')
    goStep(3)
  }

  const applyObjectionsUpdate = async () => {
    const text = objections.trim()
    if (!text) {
      setNote('Type what the app got wrong, then tap Update.')
      return
    }
    if (!project.drawing) {
      setNote('Upload a drawing first.')
      return
    }
    if (needOnline(NETWORK_ACTIONS.vision)) return
    setAiBusy(true)
    setNote('')
    setDrawingNote('Updating take-off from your objections…')
    try {
      const extracted = await extractSteelSchedule(project.drawing, {
        provider: 'gemini',
        corrections: text,
      })
      applyVisionExtraction(extracted, { ...project, confirmNotes: text, schedule: [] }, { deferMeta: true })
      setDrawingNote('Take-off updated from your objections. Review the script, then Confirm.')
    } catch (error) {
      setDrawingNote(error?.message || 'Could not update from objections.')
    } finally {
      setAiBusy(false)
    }
  }

  const confirmDrawingDescription = () => {
    if (!project.jobType) {
      setNote('No drawing type yet — go back and upload a plan.')
      return
    }
    if (isScheduleJob(project.jobType) && !(project.schedule || []).length) {
      setNote('No materials to confirm. Update objections or re-read the plan.')
      return
    }
    const script = refreshDrawingScript({ ...project, confirmNotes: objections.trim() })
    const confirmed = {
      ...project,
      confirmNotes: objections.trim(),
      drawingScript: script,
      descriptionConfirmed: true,
    }
    const extracted = projectToExtraction(confirmed)
    const nextMaster = updateMasterFromExtraction(
      master,
      extracted,
      confirmed.name || confirmed.drawingName || drawingTypeLabel(confirmed.drawingType),
    )
    setMaster(nextMaster)
    rememberDrawingTemplate(confirmed, priceForm)
    setProject(confirmed)
    setNote('')
    setDrawingNote('Confirmed. Dimensions saved to the master template / memory for this drawing nature.')
    goStep(4)
  }

  const nextFromPrices = () => {
    const saved = applySavedPricing(priceForm)
    rememberDrawingTemplate(project, saved)
    setNote('')
    goStep(5)
  }

  const finishQuote = () => {
    if (!quote) {
      setNote('Complete the drawing details first.')
      return
    }
    saveCurrentProject(quote)
    setNote('')
  }

  const printQuote = () => {
    if (!quote) return
    const lines = quote.lines.map((line) => `<li>${line.name}: ${line.detail} — ${formatPrice(line.cost)}</li>`).join('')
    const rcBlock =
      quote.kind === 'rc_columns'
        ? `<div class="box"><strong>QS build-up (columns)</strong>
            <p>Steel: ${formatPrice(quote.sections?.steel || 0)}</p>
            <p>Concrete: ${formatPrice(quote.sections?.concrete || 0)}</p>
            <p>Formwork: ${formatPrice(quote.sections?.formwork || 0)}</p>
            <p>Direct cost: ${formatPrice(quote.subtotal)}</p>
            <p>Contractor profit (${quote.marginPercent}%): ${formatPrice(quote.margin)}</p>
            ${quote.concreteM3 ? `<p>All-in ≈ ${formatPrice(quote.allInPerM3)} / m³ of column</p>` : ''}
          </div>`
        : `<div class="box">
        <p>Materials: ${formatPrice(quote.materials)}</p>
        <p>Labour (${quote.labourPercent}%): ${formatPrice(quote.labour)}</p>
        <p>Consumables (${quote.consumablesPercent}%): ${formatPrice(quote.consumables)}</p>
        <p>Margin (${quote.marginPercent}%): ${formatPrice(quote.margin)}</p>
      </div>`
    const page = `<!doctype html><html><head><title>Quote</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#1c1915}h1{font-size:22px}.box{border:1px solid #ccc;padding:16px;margin:12px 0;border-radius:12px}.green{background:#ecfdf3}.total{font-size:28px;font-weight:800}</style>
      </head><body>
      <h1>Fabrication Quote</h1>
      <p><strong>${project.name || quote.title}</strong>${project.client ? ` · Client: ${project.client}` : ''}</p>
      <p>${jobTypeLabel(project.jobType, project.drawingType)}</p>
      <div class="box"><strong>${quote.kind === 'rc_columns' ? 'Steel · Concrete · Formwork' : 'Materials'}</strong><ul>${lines}</ul>
      ${quote.wasteFactor ? `<p>Includes ×${quote.wasteFactor} steel wastage / laps on supply tonnage.</p>` : ''}
      </div>
      ${rcBlock}
      <div class="box green"><div class="total">FINAL PRICE: ${formatPrice(quote.total)}</div></div>
      </body></html>`
    const popup = window.open('', '_blank')
    if (!popup) return
    popup.document.write(page)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const orderWhatsApp = () => {
    if (!quote) return
    if (needOnline(NETWORK_ACTIONS.whatsapp)) return
    const lines = quote.lines.map((line) => `- ${line.name}: ${line.detail}`).join('\n')
    const text = `Quote: ${project.name || quote.title}\nClient: ${project.client || '-'}\n${lines}\nMaterials: ${formatPrice(quote.materials)}\nLabour: ${formatPrice(quote.labour)}\nConsumables: ${formatPrice(quote.consumables)}\nMargin: ${formatPrice(quote.margin)}\nFinal: ${formatPrice(quote.total)}`
    const number = String(pricing?.whatsapp || '').replace(/\D/g, '')
    const href = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const openDrawing = () => {
    if (!project.drawing) return
    setDrawingViewer({
      src: project.drawing,
      name: project.drawingName || 'Drawing',
      kind: project.drawingKind || (project.drawing.startsWith('data:application/pdf') ? 'pdf' : 'image'),
    })
  }

  const applySavedPricing = (pricingPatch, { persist = true } = {}) => {
    const merged = { ...emptyFabPricing(), ...rates, ...pricingPatch }
    delete merged.visionApiKey
    setPriceForm(merged)
    if (persist) onSavePricing?.(merged)
    return merged
  }

  const applyVisionExtraction = (extracted, baseProject, { fromMemory = false, deferMeta = true } = {}) => {
    const drawingType =
      extracted?.drawing_type || extracted?.drawingType || baseProject.drawingType || 'steel_structure'
    const jobType = jobTypeFromDrawingType(drawingType, {
      notes: extracted?.notes,
      name: extracted?.building?.name || baseProject.name || baseProject.drawingName,
    })
    // Always replace from this drawing — never merge leftover workshop/default rows.
    const merged = mergeScheduleWithExtraction(extracted, [], { replace: true })
    const building = merged.building || {}
    const resolvedType = merged.drawingType || drawingType
    const source = merged.source || extracted?.source || (fromMemory ? 'memory_pattern' : 'schedule_read')
    const gateInfo = merged.gate || extracted?.gate || {}
    const natureKey = drawingNatureKey({
      drawingType: resolvedType,
      building: {
        length_m: building.length_m || null,
        width_m: building.width_m || null,
      },
      schedule: merged.schedule,
    })
    const natureMemory =
      isScheduleJob(jobType)
        ? findNaturePriceMemory(natureKey, {
            drawingType: resolvedType,
            schedule: merged.schedule,
          })
        : null
    const pricingPatch = { ...rates }
    Object.entries(merged.pricingUpdates || {}).forEach(([key, value]) => {
      if (pricingPatch[key] === undefined || pricingPatch[key] === '') pricingPatch[key] = value
    })
    if (natureMemory?.match === 'exact' && natureMemory?.pricing) {
      Object.entries(natureMemory.pricing).forEach(([key, value]) => {
        if (value !== undefined && value !== '') pricingPatch[key] = value
      })
    }
    applySavedPricing(pricingPatch)

    let nextGate = { ...emptyDrawingDraft(), ...(baseProject.gate || {}) }
    if (jobType === 'gate') {
      const width = gateInfo.width_m ?? building.width_m ?? building.length_m
      const height = gateInfo.height_m ?? building.height_m
      nextGate = {
        ...nextGate,
        width: width != null && width !== '' ? String(width) : nextGate.width || '',
        height: height != null && height !== '' ? String(height) : nextGate.height || '',
        gateType: normalizeGateType(gateInfo.gate_type) || nextGate.gateType || '',
        design: normalizeGateDesign(gateInfo.design) || nextGate.design || '',
      }
      onChange(nextGate)
      setGateStep(1)
    }

    const nextProject = {
      ...baseProject,
      jobType,
      drawingType: resolvedType,
      drawingSource: source,
      natureKey: isScheduleJob(jobType) ? natureKey : '',
      descriptionConfirmed: false,
      confirmNotes: baseProject.confirmNotes || '',
      gate: nextGate,
      // Keep schedule for structure/RC always; for gate drawings keep rows when vision found members.
      schedule:
        isScheduleJob(jobType) || (jobType === 'gate' && (merged.schedule || []).length)
          ? merged.schedule
          : [],
      rcStoreys: jobType === 'rc_columns' ? merged.rcMeta?.storeys || [] : [],
      roofLength:
        jobType === 'structure' && building.length_m
          ? String(building.length_m)
          : jobType === 'structure'
            ? ''
            : baseProject.roofLength,
      roofWidth:
        jobType === 'structure' && building.width_m
          ? String(building.width_m)
          : jobType === 'structure'
            ? ''
            : baseProject.roofWidth,
      wallArea: jobType === 'structure' ? baseProject.wallArea || '' : baseProject.wallArea,
      foundationPads: jobType === 'structure' ? baseProject.foundationPads || '' : baseProject.foundationPads,
      marginPercent:
        jobType === 'rc_columns'
          ? pricingPatch.rcMarginPercent || RC_COLUMN_DEFAULT_RATES.rcMarginPercent
          : baseProject.marginPercent,
    }
    nextProject.drawingScript = refreshDrawingScript(nextProject)
    setProject(nextProject)
    if (!deferMeta) {
      const nextMaster = updateMasterFromExtraction(
        master,
        extracted,
        baseProject.name || baseProject.drawingName,
      )
      setMaster(nextMaster)
      rememberDrawingTemplate(nextProject, pricingPatch)
    }
    const typeLabel = drawingTypeLabel(resolvedType)
    const dims =
      jobType === 'gate'
        ? nextGate.width || nextGate.height
          ? ` Opening: ${nextGate.width || '—'}m × ${nextGate.height || '—'}m.`
          : ''
        : jobType === 'rc_columns' && merged.rcMeta?.netSteelKg
          ? ` Net rebar ~${merged.rcMeta.netSteelKg.toLocaleString()} kg · Concrete ~${merged.rcMeta.concreteM3} m³.`
          : building.length_m || building.width_m
            ? ` Dimensions: ${building.length_m || '—'}m × ${building.width_m || '—'}m${building.height_m ? ` × ${building.height_m}m` : ''}.`
            : ''
    const memoryNote =
      isScheduleJob(jobType)
        ? natureMemory?.match === 'exact'
          ? ` Exact unit-price memory for this nature (${natureMemory.label || 'saved rates'}).`
          : jobType === 'rc_columns'
            ? ' Confirm steel/concrete/formwork take-off, then unit prices (QS build-up).'
            : ' Confirm the take-off next, then enter unit prices.'
        : ' Confirm gate details, then the take-off script, then unit prices.'
    const sourceNote =
      source === 'estimated_from_knowledge'
        ? ' Estimated from fabrication knowledge for this plan type (not another saved job).'
        : fromMemory
          ? ' Same file found in drawing memory.'
          : ' Read from this plan.'
    const added = merged.addedSections?.length ? ` Sections: ${merged.addedSections.join(', ')}.` : ''
    setDrawingNote(`${typeLabel}.${dims}${sourceNote}${memoryNote}${added}`)
    setNote('')
    return nextProject
  }

  const onDrawingFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const fingerprint = await fingerprintFile(file)
    const dataUrl = await readFileAsDataUrl(file)
    const kind = file.type.includes('pdf') ? 'pdf' : 'image'
    // Exact same file only — a new staircase must not inherit a workshop template.
    const remembered = findSimilarDrawingTemplate(fingerprint)

    if (
      remembered?.match === 'exact' &&
      isScheduleJob(remembered.jobType) &&
      remembered.schedule?.length
    ) {
      const restored = {
        drawing: dataUrl,
        drawingName: file.name,
        drawingFingerprint: fingerprint,
        drawingKind: kind,
        jobType: remembered.jobType,
        drawingType:
          remembered.drawingType ||
          (remembered.jobType === 'rc_columns' ? 'rc_columns' : 'steel_structure'),
        drawingSource: 'memory_pattern',
        natureKey: remembered.natureKey || '',
        schedule: JSON.parse(JSON.stringify(remembered.schedule)),
        rcStoreys: JSON.parse(JSON.stringify(remembered.rcStoreys || [])),
        roofLength: remembered.roofLength || '',
        roofWidth: remembered.roofWidth || '',
        wallArea: remembered.wallArea || '',
        foundationPads: remembered.foundationPads || '',
        drawingScript: remembered.drawingScript || '',
        confirmNotes: remembered.confirmNotes || '',
        descriptionConfirmed: false,
        gate: emptyDrawingDraft(),
      }
      restored.drawingScript = restored.drawingScript || refreshDrawingScript(restored)
      const natureMemory = findNaturePriceMemory(
        restored.natureKey ||
          drawingNatureKey({
            drawingType: restored.drawingType,
            building: { length_m: restored.roofLength, width_m: restored.roofWidth },
            schedule: restored.schedule,
          }),
        { drawingType: restored.drawingType, schedule: restored.schedule },
      )
      if (natureMemory?.match === 'exact' && natureMemory?.pricing) applySavedPricing(natureMemory.pricing)
      setProject((prev) => ({ ...prev, ...restored, natureKey: natureMemory?.natureKey || restored.natureKey }))
      setObjections(restored.confirmNotes || '')
      setDrawingNote(
        `Same file in memory: “${remembered.label || file.name}” · ${drawingTypeLabel(restored.drawingType)}. Review and confirm the take-off before prices.`,
      )
      setNote('')
      return
    }

    if (remembered?.match === 'exact' && remembered.jobType === 'gate') {
      const restoredGate = { ...emptyDrawingDraft(), ...(remembered.gate || {}) }
      const restored = {
        drawing: dataUrl,
        drawingName: file.name,
        drawingFingerprint: fingerprint,
        drawingKind: kind,
        jobType: 'gate',
        drawingType: remembered.drawingType || 'gate',
        drawingSource: 'memory_pattern',
        natureKey: '',
        schedule: [],
        descriptionConfirmed: false,
        gate: restoredGate,
      }
      restored.drawingScript = refreshDrawingScript(restored)
      setProject((prev) => ({ ...prev, ...restored }))
      onChange(restoredGate)
      setGateStep(1)
      setDrawingNote(
        `Same file in memory: “${remembered.label || file.name}” · ${drawingTypeLabel(restored.drawingType)}. Confirm gate details, then the take-off script.`,
      )
      setNote('')
      return
    }

    if (needOnline(NETWORK_ACTIONS.drawing)) return

    const base = {
      ...project,
      drawing: dataUrl,
      drawingName: file.name,
      drawingFingerprint: fingerprint,
      drawingKind: kind,
      jobType: '',
      drawingType: '',
      drawingSource: '',
      schedule: [],
      roofLength: '',
      roofWidth: '',
      wallArea: '',
      foundationPads: '',
      drawingScript: '',
      confirmNotes: '',
      descriptionConfirmed: false,
      natureKey: '',
    }
    setProject(base)
    setObjections('')

    const online = readOnline()
    const provider = online ? 'gemini' : 'tesseract'
    setAiBusy(true)
    setDrawingNote(
      online
        ? 'Reading plan… checking memory patterns and fabrication knowledge for type and dimensions…'
        : 'Offline OCR reading drawing on this phone…',
    )
    try {
      const extracted = await extractSteelSchedule(dataUrl, { provider })
      applyVisionExtraction(extracted, base)
    } catch (error) {
      setDrawingNote(
        error?.message
          ? `Auto-read failed: ${error.message}. You can still mark this as a gate or steel structure below.`
          : 'Auto-read failed. You can still mark this as a gate or steel structure below.',
      )
    } finally {
      setAiBusy(false)
    }
  }

  const runAiReadAgain = async () => {
    if (!project.drawing) return
    if (needOnline(NETWORK_ACTIONS.vision)) return
    setAiBusy(true)
    setDrawingNote('Reading plan again… identifying type, dimensions, and materials…')
    try {
      const extracted = await extractSteelSchedule(project.drawing, {
        provider: 'gemini',
        corrections: objections.trim(),
      })
      applyVisionExtraction(extracted, { ...project, schedule: [] }, { deferMeta: true })
    } catch (error) {
      setDrawingNote(error?.message || 'Auto-read failed.')
    } finally {
      setAiBusy(false)
    }
  }

  const treatAsJobType = (jobType) => {
    if (jobType === 'gate') {
      const nextGate = { ...emptyDrawingDraft(), ...(project.gate || {}) }
      setProject((prev) => ({
        ...prev,
        jobType: 'gate',
        drawingType: prev.drawingType && ['gate', 'burglar'].includes(prev.drawingType) ? prev.drawingType : 'gate',
        schedule: [],
        gate: nextGate,
      }))
      onChange(nextGate)
      setGateStep(1)
      setDrawingNote('Marked as gate / burglar. Confirm opening size, type, and design.')
      setNote('')
      return
    }
    setProject((prev) => {
      const next = {
        ...prev,
        jobType: 'structure',
        drawingType:
          prev.drawingType && !['gate', 'burglar'].includes(prev.drawingType)
            ? prev.drawingType
            : 'steel_structure',
        schedule: prev.schedule?.length ? prev.schedule : [],
        descriptionConfirmed: false,
      }
      next.drawingScript = refreshDrawingScript(next)
      return next
    })
    setDrawingNote('Marked as steel structure. Re-read the plan or add members, then confirm the take-off.')
    setNote('')
  }

  const updateUnitPrice = (priceKey, value) => {
    const next = applySavedPricing({ [priceKey]: value })
    if (project.natureKey || isScheduleJob(project.jobType)) {
      const natureKey =
        project.natureKey ||
        drawingNatureKey({
          drawingType: project.drawingType,
          building: { length_m: project.roofLength, width_m: project.roofWidth },
          schedule: project.schedule,
        })
      rememberNaturePrices({
        natureKey,
        drawingType: project.drawingType || 'steel_structure',
        label: project.name || project.drawingName || 'Latest unit prices',
        pricing: next,
        schedule: project.schedule || [],
        building: {
          length_m: Number(project.roofLength) || null,
          width_m: Number(project.roofWidth) || null,
        },
      })
      if (!project.natureKey) updateProject({ natureKey })
    }
  }

  const DrawingAttach = () =>
    project.drawing ? (
      <div className="fab-drawing-attach">
        {project.drawingKind === 'image' || project.drawing.startsWith('data:image') ? (
          <button type="button" className="fab-drawing-preview-btn" onClick={openDrawing}>
            <img className="fab-drawing-preview" src={project.drawing} alt={project.drawingName || 'Drawing'} />
          </button>
        ) : (
          <div className="fab-pdf-chip">
            <strong>{project.drawingName || 'Drawing.pdf'}</strong>
            <span>PDF attached</span>
          </div>
        )}
        <div className="fab-drawing-actions">
          <button type="button" className="fab-next-btn fab-btn-outline" onClick={openDrawing}>
            Open {project.drawingKind === 'pdf' ? 'PDF' : 'photo'}
          </button>
          <button type="button" className="fab-go-btn" disabled={aiBusy} onClick={runAiReadAgain}>
            {aiBusy ? 'READING PLAN…' : 'READ PLAN → DETECT TYPE'}
          </button>
        </div>
        {drawingNote ? <p className="fab-note fab-remember-note">{drawingNote}</p> : null}
      </div>
    ) : null

  const usesPalisadeSpacing = (project.gate?.design === 'palisade' || project.gate?.design === 'half')
  const wizard = view === 'home'

  return (
    <div className="fab-app">
      <header className="fab-app-bar">
        <button type="button" className="fab-menu-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <HistoryNav
          canBack={canHistoryBack}
          canForward={canHistoryForward}
          onBack={onHistoryBack}
          onForward={onHistoryForward}
        />
        <div>
          <p className="eyebrow">Fabrication website{online ? '' : ' · offline'}</p>
          <strong>{project.name || 'Fabrication website'}</strong>
        </div>
        {onBack ? (
          <button
            type="button"
            className="text-back fab-fortress-home"
            onClick={onBack}
            aria-label={`Back to ${backLabel}`}
          >
            <FabMenuIcon name="home" />
            {backLabel}
          </button>
        ) : (
          <span />
        )}
      </header>

      {!online ? (
        <p className="fab-offline-banner" role="status">
          Offline — open saved projects, drawings, and photos from this device. Live uploads from other users, new uploads,
          Fortress chat AI, Gemini, WhatsApp, EcoCash, and app updates need internet data.
        </p>
      ) : null}

      {menuOpen ? (
        <div className="fab-menu-sheet" onClick={() => setMenuOpen(false)}>
          <nav className="fab-menu" aria-label="Calculator menu" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Menu</p>
            <button
              type="button"
              className={wizard && step === 0 ? 'active' : ''}
              onClick={() => goView('home')}
            >
              <FabMenuIcon name="home" />
              Home
            </button>
            <button
              type="button"
              className={view === 'pricing' ? 'active' : ''}
              onClick={() => {
                setPriceForm({ ...emptyFabPricing(), ...(pricing || {}) })
                goView('pricing')
              }}
            >
              <FabMenuIcon name="pricing" />
              Price list
            </button>
            <button
              type="button"
              className={view === 'subscriptions' ? 'active' : ''}
              onClick={() => goView('subscriptions')}
            >
              <FabMenuIcon name="subscriptions" />
              Subscriptions
            </button>
            <button type="button" className={view === 'documents' ? 'active' : ''} onClick={() => goView('documents')}>
              <FabMenuIcon name="documents" />
              Documents
            </button>
          </nav>
        </div>
      ) : null}

      {wizard && step === 0 ? (
        <main className="fab-home">
          <section className="fab-section">
            <div className="fab-title-row">
              <h1>Fabrication website</h1>
              {!subActive ? <span className="fab-freemium-sticker">$100/month</span> : null}
            </div>
            <p>
              Upload any drawing. The app reads this plan only (same file can reuse memory), shows a take-off script to
              confirm, then unit prices and quotation.
            </p>
            {!subActive ? (
              <p className="fab-freemium-meter" role="status">
                $100/month. Pay first, or start a 14 day free trial from Buy CEO Website.
              </p>
            ) : (
              <p className="fab-freemium-meter fab-freemium-meter-active" role="status">
                {trialActive
                  ? `14 day trial active until ${new Date(Number(site?.trialUntil)).toLocaleDateString()}`
                  : 'Subscription active — unlimited drawings and gate quotes'}
              </p>
            )}
            {freemiumNote ? <p className="fab-freemium-alert">{freemiumNote}</p> : null}
            <button type="button" className="fab-hero-btn" onClick={startNewProject}>
              CREATE PROJECT
            </button>
            <p className="fab-note">
              Upload a CAD plan, scan, or hand-drawn sketch, or price a gate with no drawing. This calculator is $100/month,
              or a 14 day trial.
            </p>
            <div className="fab-master-card">
              <strong>Master template</strong>
              <small>
                {master.learned_count || 0} drawing{(master.learned_count || 0) === 1 ? '' : 's'} learned
              </small>
            </div>
          </section>
          <section className="fab-section">
            <h2>Recent projects</h2>
            {projects.length ? (
              <div className="fab-recent">
                {projects.map((item) => (
                  <button key={item.id} type="button" onClick={() => openProject(item)}>
                    <strong>{item.name || 'Project'}</strong>
                    <small>
                      {item.client ? `${item.client} · ` : ''}
                      {jobTypeLabel(item.jobType, item.drawingType)}
                    </small>
                    <span>{formatPrice(item.quoteTotal)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-note">No projects yet.</p>
            )}
          </section>
        </main>
      ) : null}

      {wizard && step === 1 ? (
        <main className="fab-home">
          <section className="fab-section">
            <div className="fab-title-row">
              <h1>Create project</h1>
              {!subActive ? <span className="fab-freemium-sticker">$100/month</span> : null}
            </div>
            <p className="fab-note">
              Name the job, then upload a drawing — or price a gate with no drawing. Payment or an active 14 day trial is required.
            </p>
            {!subActive ? (
              <p className="fab-freemium-meter" role="status">
                $100/month. Pay first, or use an active 14 day trial.
              </p>
            ) : null}
            {freemiumNote ? <p className="fab-freemium-alert">{freemiumNote}</p> : null}
            <label className="fab-field">
              Project name
              <input
                value={project.name}
                placeholder="e.g. Mbare Workshop"
                onChange={(event) => updateProject({ name: event.target.value })}
              />
            </label>
            <label className="fab-field">
              Client
              <input
                value={project.client}
                placeholder="Client name"
                onChange={(event) => updateProject({ client: event.target.value })}
              />
            </label>
            {note ? <p className="form-error">{note}</p> : null}
            <div className="fab-path-choice">
              <button
                type="button"
                className="fab-next-btn"
                onClick={() => nextFromProject('drawing')}
                disabled={!canUploadDrawing}
              >
                Upload drawing
              </button>
              <button
                type="button"
                className="fab-next-btn fab-btn-outline"
                onClick={() => nextFromProject('plan_manual')}
                disabled={!canStartGateQuote}
              >
                Plan without drawing
              </button>
              {!canUseFreemiumJob ? (
                <button type="button" className="fab-next-btn" onClick={() => goView('subscriptions')}>
                  View subscriptions
                </button>
              ) : null}
            </div>
          </section>
        </main>
      ) : null}

      {wizard && pathMode === 'drawing' && step >= 2 ? (
        <DrawingChatSession
          project={project}
          pricing={rates}
          online={online}
          jobTypeLabel={jobTypeLabel}
          canUploadDrawing={canUploadDrawing}
          freeDrawsLeft={freeLeft}
          subscriptionActive={subActive}
          freemiumNote={freemiumNote}
          onNeedOnline={(actionKey) =>
            needOnline(NETWORK_ACTIONS[actionKey] || NETWORK_ACTIONS.vision)
          }
          onOpenDrawing={openDrawing}
          onGuardUpload={guardDrawingUpload}
          onConsumeFreeUpload={consumeFreeDrawingUpload}
          onRequireSubscription={() => {
            setFreemiumNote('Subscribe to upload more drawings — $100/month.')
            goView('subscriptions')
          }}
          onUpdateProject={(patch) => updateProject(patch)}
          onApplyExtraction={(extracted, meta = {}) => {
            const dataUrl = meta.dataUrl || project.drawing
            const kindFromData =
              typeof dataUrl === 'string' && dataUrl.startsWith('data:application/pdf')
                ? 'pdf'
                : typeof dataUrl === 'string' && dataUrl.startsWith('data:image')
                  ? 'image'
                  : ''
            const base = {
              ...project,
              drawing: dataUrl,
              drawingName: meta.drawingName || project.drawingName,
              drawingFingerprint: meta.fingerprint || project.drawingFingerprint,
              drawingKind: kindFromData || project.drawingKind || 'image',
              confirmNotes: meta.corrections || project.confirmNotes || '',
            }
            return applyVisionExtraction(extracted, base, { deferMeta: true })
          }}
          onPersistPricing={(patch) => applySavedPricing(patch)}
          onSaveQuote={(finalQuote) => {
            saveCurrentProject(finalQuote)
            setNote('Quote saved.')
          }}
        />
      ) : null}

      {wizard && pathMode === 'plan_manual' && step === 2 ? (
        <main className="fab-home">
          <section className="fab-section">
            <div className="fab-title-row">
              <h1>Plan without drawing</h1>
              {!subActive ? <span className="fab-freemium-sticker">$100/month</span> : null}
            </div>
            {!project.planKind ? (
              <p className="fab-note">Choose what to price — Zimbabwe shop formulas, no drawing needed.</p>
            ) : null}
            {!subActive ? (
              <p className="fab-freemium-meter" role="status">
                $100/month. Pay first, or use an active 14 day trial.
              </p>
            ) : null}
            {freemiumNote ? <p className="fab-freemium-alert">{freemiumNote}</p> : null}

            {!canStartGateQuote && !freemiumConsumedForProject ? (
              <div className="drawing-paywall">
                <p className="fab-freemium-alert">
                  The fabrication calculator is $100/month. Pay first, or use an active 14 day trial.
                </p>
                <button type="button" className="fab-next-btn" onClick={() => goView('subscriptions')}>
                  View subscriptions
                </button>
              </div>
            ) : null}

            {(canStartGateQuote || freemiumConsumedForProject) && !project.planKind ? (
              <div className="fab-choice-list">
                <button type="button" className="fab-type-card" onClick={() => choosePlanKind('gate')}>
                  <span>
                    <strong>Gates</strong>
                    <small>Sliding, swing double, swing single — same take-off as before</small>
                  </span>
                </button>
                <button type="button" className="fab-type-card" onClick={() => choosePlanKind('palisade')}>
                  <span>
                    <strong>Palisade fencing</strong>
                    <small>Pales, rails, posts — L / Ws + 1 · 10% waste</small>
                  </span>
                </button>
                <button type="button" className="fab-type-card" onClick={() => choosePlanKind('burglar')}>
                  <span>
                    <strong>Burglar bars</strong>
                    <small>Square tube, flat bar, or heavy duty — window frame formulas</small>
                  </span>
                </button>
              </div>
            ) : null}

            {project.planKind === 'gate' && (canStartGateQuote || freemiumConsumedForProject) ? (
              <>
                <p className="fab-note">
                  Enter opening size, gate type, and design. Materials use the classic fabrication formulas.
                </p>
                <button
                  type="button"
                  className="fab-next-btn fab-btn-outline"
                  onClick={() => {
                    setProject((prev) => ({ ...prev, planKind: '', jobType: '', drawingType: '' }))
                    setGateStep(1)
                  }}
                >
                  ← All plans
                </button>
                {gateStep === 1 ? (
                  <>
                    <h2>Opening size</h2>
                    <label className="fab-field">
                      Width (m)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g 4.0"
                        value={project.gate?.width || ''}
                        onChange={(event) => updateGate({ width: event.target.value })}
                      />
                    </label>
                    <label className="fab-field">
                      Height (m)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g 2.0"
                        value={project.gate?.height || ''}
                        onChange={(event) => updateGate({ height: event.target.value })}
                      />
                    </label>
                    <label className="fab-field">
                      Palisade Spacing (m)
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={project.gate?.spacing || String(FAB_DEFAULT_SPACING)}
                        onChange={(event) => updateGate({ spacing: event.target.value })}
                      />
                      <small>0.10m = High Security, 0.15m = Normal. Default: 0.12m. Used for Palisade / Half & Half.</small>
                    </label>
                    <button type="button" className="fab-next-btn" onClick={() => setGateStep(2)}>
                      NEXT → TYPE
                    </button>
                  </>
                ) : null}

                {gateStep === 2 ? (
                  <>
                    <h2>Gate type</h2>
                    <div className="fab-choice-list">
                      {FAB_CALC_TYPES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`fab-type-card ${project.gate?.gateType === item.id ? 'active' : ''}`}
                          onClick={() => updateGate({ gateType: item.id })}
                        >
                          <FabTypeIcon name={item.id} />
                          <span>
                            <strong>{item.name}</strong>
                            {item.copy ? <small>{item.copy}</small> : null}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="fab-result-actions">
                      <button type="button" className="fab-next-btn fab-btn-outline" onClick={() => setGateStep(1)}>
                        BACK
                      </button>
                      <button type="button" className="fab-next-btn" onClick={() => setGateStep(3)}>
                        NEXT → DESIGN
                      </button>
                    </div>
                  </>
                ) : null}

                {gateStep === 3 ? (
                  <>
                    <h2>Design</h2>
                    <div className="fab-design-grid">
                      {FAB_CALC_DESIGNS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`fab-design-card ${project.gate?.design === item.id ? 'active' : ''}`}
                          onClick={() => updateGate({ design: item.id })}
                        >
                          <FabDesignImage name={item.id} />
                          <strong>{item.title}</strong>
                          <small>{item.copy}</small>
                        </button>
                      ))}
                    </div>
                    {usesPalisadeSpacing ? (
                      <label className="fab-field">
                        Palisade Spacing (m)
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={project.gate?.spacing || String(FAB_DEFAULT_SPACING)}
                          onChange={(event) => updateGate({ spacing: event.target.value })}
                        />
                      </label>
                    ) : null}
                    {note ? <p className="form-error">{note}</p> : null}
                    <div className="fab-result-actions">
                      <button type="button" className="fab-next-btn fab-btn-outline" onClick={() => setGateStep(2)}>
                        BACK
                      </button>
                      <button
                        type="button"
                        className="fab-go-btn"
                        onClick={() => {
                          const g = project.gate || {}
                          if (!Number(g.width) || !Number(g.height)) {
                            setNote('Enter gate width and height first.')
                            setGateStep(1)
                            return
                          }
                          if (!g.gateType) {
                            setNote('Choose a gate type.')
                            setGateStep(2)
                            return
                          }
                          if (!g.design) {
                            setNote('Choose a gate design.')
                            return
                          }
                          if ((g.design === 'palisade' || g.design === 'half') && !(Number(g.spacing) > 0)) {
                            setNote('Enter palisade spacing.')
                            return
                          }
                          setNote('')
                          goStep(3)
                        }}
                      >
                        NEXT → GATE TAKE-OFF
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            {project.planKind === 'palisade' && (canStartGateQuote || freemiumConsumedForProject) ? (
              <>
                <p className="fab-note">
                  Zim shop formula: pales (L/Ws)+1, rails by height, posts round(L/spacing)+1, then ×1.1 waste.
                </p>
                <button
                  type="button"
                  className="fab-next-btn fab-btn-outline"
                  onClick={() => {
                    setProject((prev) => ({ ...prev, planKind: '', jobType: '', drawingType: '' }))
                    setPlanStep(1)
                  }}
                >
                  ← All plans
                </button>
                <h2>Fence size</h2>
                <label className="fab-field">
                  Total length L (m)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g 30"
                    value={project.palisade?.length || ''}
                    onChange={(event) => updatePalisade({ length: event.target.value })}
                  />
                </label>
                <label className="fab-field">
                  Pale height H (m)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g 1.8"
                    value={project.palisade?.height || ''}
                    onChange={(event) => updatePalisade({ height: event.target.value })}
                  />
                </label>
                <label className="fab-field">
                  Pale spacing Ws (m)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={project.palisade?.spacing || String(PALISADE_DEFAULTS.spacing)}
                    onChange={(event) => updatePalisade({ spacing: event.target.value })}
                  />
                  <small>Standard security = 0.11 m (110 mm centres).</small>
                </label>
                <label className="fab-field">
                  Post spacing (m)
                  <input
                    type="number"
                    min="0.5"
                    step="0.05"
                    value={project.palisade?.postSpacing || String(PALISADE_DEFAULTS.postSpacing)}
                    onChange={(event) => updatePalisade({ postSpacing: event.target.value })}
                  />
                  <small>Standard 2.75 m (usually 2.5–3 m).</small>
                </label>
                {note ? <p className="form-error">{note}</p> : null}
                <button
                  type="button"
                  className="fab-go-btn"
                  onClick={() => {
                    const p = project.palisade || {}
                    if (!Number(p.length) || !Number(p.height)) {
                      setNote('Enter fence length and pale height.')
                      return
                    }
                    if (!(Number(p.spacing) > 0)) {
                      setNote('Enter pale spacing.')
                      return
                    }
                    if (!(Number(p.postSpacing) > 0)) {
                      setNote('Enter post spacing.')
                      return
                    }
                    setNote('')
                    goStep(3)
                  }}
                >
                  NEXT → FENCE TAKE-OFF
                </button>
              </>
            ) : null}

            {project.planKind === 'burglar' && (canStartGateQuote || freemiumConsumedForProject) ? (
              <>
                <p className="fab-note">
                  Zim shop formula: frame 2×(W+Ht), verticals (W/spacing)−1, middle bars by height, then ×1.05 waste.
                </p>
                <button
                  type="button"
                  className="fab-next-btn fab-btn-outline"
                  onClick={() => {
                    setProject((prev) => ({ ...prev, planKind: '', jobType: '', drawingType: '' }))
                    setPlanStep(1)
                  }}
                >
                  ← All plans
                </button>
                {planStep === 1 ? (
                  <>
                    <h2>Window size</h2>
                    <label className="fab-field">
                      Width W (m)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g 1.5"
                        value={project.burglar?.width || ''}
                        onChange={(event) => updateBurglar({ width: event.target.value })}
                      />
                    </label>
                    <label className="fab-field">
                      Height Ht (m)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g 1.2"
                        value={project.burglar?.height || ''}
                        onChange={(event) => updateBurglar({ height: event.target.value })}
                      />
                    </label>
                    <label className="fab-field">
                      Bar spacing (m)
                      <input
                        type="number"
                        min="0.05"
                        step="0.01"
                        value={project.burglar?.spacing || String(BURGLAR_DEFAULTS.spacing)}
                        onChange={(event) => updateBurglar({ spacing: event.target.value })}
                      />
                      <small>Standard 0.12 m — security not more than 0.15 m.</small>
                    </label>
                    <button
                      type="button"
                      className="fab-next-btn"
                      onClick={() => {
                        const b = project.burglar || {}
                        if (!Number(b.width) || !Number(b.height)) {
                          setNote('Enter window width and height.')
                          return
                        }
                        setNote('')
                        setPlanStep(2)
                      }}
                    >
                      NEXT → TYPE
                    </button>
                  </>
                ) : null}
                {planStep === 2 ? (
                  <>
                    <h2>Burglar bar type</h2>
                    <div className="fab-choice-list">
                      {BURGLAR_TYPES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`fab-type-card ${project.burglar?.barType === item.id ? 'active' : ''}`}
                          onClick={() => updateBurglar({ barType: item.id })}
                        >
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.copy}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    {note ? <p className="form-error">{note}</p> : null}
                    <div className="fab-result-actions">
                      <button type="button" className="fab-next-btn fab-btn-outline" onClick={() => setPlanStep(1)}>
                        BACK
                      </button>
                      <button
                        type="button"
                        className="fab-go-btn"
                        onClick={() => {
                          const b = project.burglar || {}
                          if (!Number(b.width) || !Number(b.height)) {
                            setNote('Enter window width and height.')
                            setPlanStep(1)
                            return
                          }
                          if (!b.barType) {
                            setNote('Choose a burglar bar type.')
                            return
                          }
                          setNote('')
                          goStep(3)
                        }}
                      >
                        NEXT → BURGLAR TAKE-OFF
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            {note ? <p className="form-error">{note}</p> : null}
          </section>
        </main>
      ) : null}

      {wizard && pathMode === 'plan_manual' && step >= 3 && project.planKind === 'gate' ? (
        <GateChatSession
          project={project}
          pricing={rates}
          onUpdateGate={(patch) => updateGate(patch)}
          onUpdateProject={(patch) => updateProject(patch)}
          onPersistPricing={(patch) => applySavedPricing(patch)}
          onSaveQuote={(finalQuote) => {
            saveCurrentProject(finalQuote)
            setNote('Quote saved.')
          }}
        />
      ) : null}

      {wizard &&
      pathMode === 'plan_manual' &&
      step >= 3 &&
      (project.planKind === 'palisade' || project.planKind === 'burglar') ? (
        <PlanChatSession
          key={`${project.planKind}-${project.id || project.name}`}
          kind={project.planKind}
          project={project}
          draft={project.planKind === 'palisade' ? project.palisade : project.burglar}
          pricing={rates}
          onUpdateDraft={(next) => {
            if (project.planKind === 'palisade') {
              setProject((prev) => ({
                ...prev,
                palisade: { ...emptyPalisadeDraft(), ...next },
              }))
            } else {
              setProject((prev) => ({
                ...prev,
                burglar: { ...emptyBurglarDraft(), ...next },
              }))
            }
          }}
          onUpdateProject={(patch) => updateProject(patch)}
          onPersistPricing={(patch) => applySavedPricing(patch)}
          onSaveQuote={(finalQuote) => {
            saveCurrentProject(finalQuote)
            setNote('Quote saved.')
          }}
        />
      ) : null}

      {wizard && pathMode === 'gate_manual' && step === 3 && false ? (
        <main className="fab-home">
          <section className="fab-section">
            <h1>Confirm gate take-off</h1>
            <p className="fab-note">
              Review the calculated materials for this gate opening, then continue to unit prices.
            </p>
            <DrawingAttach />

            <div className="fab-plan-summary fab-confirm-meta">
              <h2>Meta / master link</h2>
              <p>
                <strong>Type:</strong> {jobTypeLabel(project.jobType, project.drawingType)}
              </p>
              <p>
                <strong>Nature key:</strong> {project.natureKey || '— (set on confirm)'}
              </p>
              <p>
                <strong>Master learned from:</strong> {master.learned_from || '—'} · {master.learned_count || 0}{' '}
                drawing{(master.learned_count || 0) === 1 ? '' : 's'}
              </p>
            </div>

            <h2>Drawing description</h2>
            <pre className="fab-drawing-script">
              {project.drawingScript || refreshDrawingScript(project)}
            </pre>

            {isScheduleJob(project.jobType) ? (
              <>
                <h2>{project.jobType === 'rc_columns' ? 'Edit take-off if needed' : 'Edit members if needed'}</h2>
                <div className="fab-schedule">
                  {(project.schedule || []).map((row) => (
                    <article key={row.id} className="fab-schedule-row">
                      <strong>
                        {row.role}
                        {row.mark ? ` ${row.mark}` : ''} · {row.section}
                      </strong>
                      <div className="fab-size-row">
                        {row.unit === 'kg' ? (
                          <>
                            <label>
                              kg/m (unit weight)
                              <input type="number" min="0" step="0.001" value={row.kgEach} readOnly />
                            </label>
                            <label>
                              Total m (all floors)
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={row.meters}
                                onChange={(event) => updateScheduleRow(row.id, { meters: event.target.value })}
                              />
                            </label>
                            <label>
                              Weight kg (from drawing table)
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={row.qty}
                                onChange={(event) => updateScheduleRow(row.id, { qty: event.target.value })}
                              />
                            </label>
                            {row.mark ? <p className="fab-note">Buy {row.mark}</p> : null}
                          </>
                        ) : row.unit === 'm3' || row.unit === 'm2' ? (
                          <label>
                            Qty ({row.unit})
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.qty}
                              onChange={(event) => updateScheduleRow(row.id, { qty: event.target.value })}
                            />
                          </label>
                        ) : (
                          <>
                            {row.unit !== 'm' || row.qty !== '' ? (
                              <label>
                                Qty
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={row.qty}
                                  onChange={(event) => updateScheduleRow(row.id, { qty: event.target.value })}
                                />
                              </label>
                            ) : (
                              <span />
                            )}
                            {row.unit === 'm' ? (
                              <label>
                                Total m
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.meters}
                                  onChange={(event) => updateScheduleRow(row.id, { meters: event.target.value })}
                                />
                              </label>
                            ) : null}
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {project.jobType === 'structure' ? (
                  <div className="fab-size-row">
                    <label>
                      Length (m)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={project.roofLength}
                        onChange={(event) => updateProject({ roofLength: event.target.value })}
                      />
                    </label>
                    <label>
                      Width (m)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={project.roofWidth}
                        onChange={(event) => updateProject({ roofWidth: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}

            <label className="fab-field">
              Notes
              <textarea
                rows={3}
                value={objections}
                placeholder="Optional notes for this gate quote…"
                onChange={(event) => setObjections(event.target.value)}
              />
            </label>
            <div className="fab-result-actions">
              <button
                type="button"
                className="fab-next-btn fab-btn-outline"
                onClick={() => {
                  const script = refreshDrawingScript({ ...project, confirmNotes: objections.trim() })
                  updateProject({ drawingScript: script, confirmNotes: objections.trim() })
                  setDrawingNote('Script refreshed from current gate details.')
                }}
              >
                REFRESH SCRIPT
              </button>
            </div>
            {drawingNote ? <p className="fab-note fab-remember-note">{drawingNote}</p> : null}
            {note ? <p className="form-error">{note}</p> : null}
            <div className="fab-result-actions">
              <button type="button" className="fab-next-btn fab-btn-outline" onClick={() => goStep(2)}>
                BACK
              </button>
              <button type="button" className="fab-go-btn" disabled={aiBusy} onClick={confirmDrawingDescription}>
                CONFIRM → UNIT PRICES
              </button>
            </div>
          </section>
        </main>
      ) : null}

      {wizard && pathMode === 'gate_manual' && step === 4 && false ? (
        <main className="fab-home">
          <section className="fab-section">
            <h1>Step 4 — Unit prices</h1>
            <p className="fab-note">
              {project.jobType === 'rc_columns'
                ? 'Zim QS rates for columns: rebar $/kg, fixing labour $/kg, concrete $/m³, formwork $/m², then contractor %.'
                : project.jobType === 'structure'
                  ? 'Prices for materials on this plan. Latest entries update the price list and auto-fill the next similar drawing. Edit anytime.'
                  : 'Your price list — saved once, used on every quote. Edit anytime.'}
            </p>
            {project.jobType === 'gate' ? (
              <>
                <div className="fab-size-row">
                  <label>
                    50x50 per m
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.tube50PerM}
                      onChange={(event) => updateUnitPrice('tube50PerM', event.target.value)}
                    />
                  </label>
                  <label>
                    25x25 per m
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.tube25PerM}
                      onChange={(event) => updateUnitPrice('tube25PerM', event.target.value)}
                    />
                  </label>
                </div>
                <div className="fab-size-row">
                  <label>
                    U-Channel per m
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.uChannelPerM}
                      onChange={(event) => updateUnitPrice('uChannelPerM', event.target.value)}
                    />
                  </label>
                  <label>
                    IBR per sqm
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.sheetPerM2}
                      onChange={(event) => updateUnitPrice('sheetPerM2', event.target.value)}
                    />
                  </label>
                </div>
              </>
            ) : project.jobType === 'rc_columns' ? (
              <>
                <h2>1. Steel</h2>
                <div className="fab-size-row">
                  <label>
                    Rebar supply $/kg
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.rebarPerKg}
                      onChange={(event) => updateUnitPrice('rebarPerKg', event.target.value)}
                    />
                  </label>
                  <label>
                    Fixing labour $/kg
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.rebarFixPerKg}
                      onChange={(event) => updateUnitPrice('rebarFixPerKg', event.target.value)}
                    />
                  </label>
                </div>
                <div className="fab-size-row">
                  <label>
                    Wastage / laps factor
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={priceForm.rcWasteFactor}
                      onChange={(event) => updateUnitPrice('rcWasteFactor', event.target.value)}
                    />
                  </label>
                  <span />
                </div>
                <h2>2. Concrete</h2>
                <div className="fab-size-row">
                  <label>
                    C25 concrete $/m³
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.concreteC25PerM3}
                      onChange={(event) => updateUnitPrice('concreteC25PerM3', event.target.value)}
                    />
                  </label>
                  <span />
                </div>
                <h2>3. Formwork</h2>
                <div className="fab-size-row">
                  <label>
                    Formwork $/m²
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.formworkPerM2}
                      onChange={(event) => updateUnitPrice('formworkPerM2', event.target.value)}
                    />
                  </label>
                  <span />
                </div>
              </>
            ) : (
              <>
                <div className="fab-schedule fab-unit-prices">
                  {(project.schedule || []).map((row) => (
                    <article key={`price-${row.id}`} className="fab-schedule-row">
                      <strong>
                        {row.role}
                        {row.mark ? ` ${row.mark}` : ''} · {row.section}
                      </strong>
                      <label className="fab-field">
                        Unit price ({row.unit === 'm' ? 'per m' : row.unit === 'kg' ? 'per kg' : 'each'})
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceForm[row.priceKey] ?? ''}
                          onChange={(event) => updateUnitPrice(row.priceKey, event.target.value)}
                        />
                      </label>
                    </article>
                  ))}
                </div>
                <h2>Cladding & foundation</h2>
                <div className="fab-size-row">
                  <label>
                    IBR / sqm
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.ibrPerM2}
                      onChange={(event) => updateUnitPrice('ibrPerM2', event.target.value)}
                    />
                  </label>
                  <label>
                    F1 pad each
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.foundationPad}
                      onChange={(event) => updateUnitPrice('foundationPad', event.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
            {project.jobType !== 'rc_columns' ? (
            <div className="fab-size-row">
              <label>
                Labour %
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceForm.labourPercent}
                  onChange={(event) => updateUnitPrice('labourPercent', event.target.value)}
                />
              </label>
              <label>
                Consumables %
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceForm.consumablesPercent}
                  onChange={(event) => updateUnitPrice('consumablesPercent', event.target.value)}
                />
              </label>
            </div>
            ) : null}
            <div className="fab-size-row">
              <label>
                {project.jobType === 'rc_columns' ? 'Contractor profit %' : 'Profit %'}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    project.jobType === 'rc_columns'
                      ? priceForm.rcMarginPercent
                      : priceForm.marginPercent
                  }
                  onChange={(event) =>
                    updateUnitPrice(
                      project.jobType === 'rc_columns' ? 'rcMarginPercent' : 'marginPercent',
                      event.target.value,
                    )
                  }
                />
              </label>
              <label>
                WhatsApp
                <input
                  type="tel"
                  value={priceForm.whatsapp}
                  onChange={(event) => updateUnitPrice('whatsapp', event.target.value)}
                />
              </label>
            </div>
            <button type="button" className="fab-go-btn" onClick={nextFromPrices}>
              SAVE PRICES → CALCULATE
            </button>
          </section>
        </main>
      ) : null}

      {wizard && pathMode === 'gate_manual' && step === 5 && false ? (
        <main className="fab-home">
          <section className="fab-section">
            <h1>Step 5 — Quote</h1>
            {quote ? (
              <>
                <div className="fab-result-blue">
                  {project.name || quote.title}
                  {project.client ? ` · ${project.client}` : ''}
                  <small>
                    {isScheduleJob(project.jobType)
                      ? jobTypeLabel(project.jobType, project.drawingType)
                      : quote.title}
                  </small>
                </div>
                <DrawingAttach />
                {project.drawingScript ? (
                  <pre className="fab-drawing-script fab-drawing-script-compact">{project.drawingScript}</pre>
                ) : null}
                <div className="fab-cost-list">
                  {quote.kind === 'rc_columns' ? (
                    <>
                      <div className="fab-cost-total">
                        <span>1. Steel</span>
                        <strong>{formatPrice(quote.sections?.steel || 0)}</strong>
                      </div>
                      <div className="fab-cost-total">
                        <span>2. Concrete</span>
                        <strong>{formatPrice(quote.sections?.concrete || 0)}</strong>
                      </div>
                      <div className="fab-cost-total">
                        <span>3. Formwork</span>
                        <strong>{formatPrice(quote.sections?.formwork || 0)}</strong>
                      </div>
                    </>
                  ) : null}
                  {quote.lines.map((line) => (
                    <div key={line.name}>
                      <span>
                        {line.name}
                        <small className="fab-line-detail"> {line.detail}</small>
                      </span>
                      <strong>{formatPrice(line.cost)}</strong>
                    </div>
                  ))}
                  {quote.wasteFactor ? (
                    <div>
                      <span>Steel wastage / laps ×{quote.wasteFactor}</span>
                      <strong>included on supply</strong>
                    </div>
                  ) : null}
                  {quote.kind === 'rc_columns' ? (
                    <>
                      <div className="fab-cost-total">
                        <span>Direct cost (steel + concrete + formwork)</span>
                        <strong>{formatPrice(quote.subtotal)}</strong>
                      </div>
                      <div>
                        <span>Contractor profit ({quote.marginPercent}%)</span>
                        <strong>{formatPrice(quote.margin)}</strong>
                      </div>
                      {quote.concreteM3 > 0 ? (
                        <div>
                          <span>All-in per m³ of column</span>
                          <strong>{formatPrice(quote.allInPerM3)}</strong>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="fab-cost-total">
                        <span>Materials</span>
                        <strong>{formatPrice(quote.materials)}</strong>
                      </div>
                      <div>
                        <span>Labour ({quote.labourPercent}%)</span>
                        <strong>{formatPrice(quote.labour)}</strong>
                      </div>
                      <div>
                        <span>Consumables ({quote.consumablesPercent}%)</span>
                        <strong>{formatPrice(quote.consumables)}</strong>
                      </div>
                      <div>
                        <span>Subtotal</span>
                        <strong>{formatPrice(quote.subtotal)}</strong>
                      </div>
                      <div>
                        <span>Profit ({quote.marginPercent}%)</span>
                        <strong>{formatPrice(quote.margin)}</strong>
                      </div>
                    </>
                  )}
                </div>
                <div className="fab-result-green">
                  <p>FINAL ESTIMATED PRICE: {formatPrice(quote.total)}</p>
                </div>
                <div className="fab-result-actions">
                  <button type="button" className="fab-next-btn fab-btn-outline" onClick={() => goStep(3)}>
                    EDIT TAKE-OFF
                  </button>
                  <button
                    type="button"
                    className="fab-next-btn fab-btn-outline"
                    onClick={() => {
                      finishQuote()
                      printQuote()
                    }}
                  >
                    GENERATE PDF QUOTE
                  </button>
                  <button
                    type="button"
                    className="fab-wa-btn"
                    onClick={() => {
                      finishQuote()
                      orderWhatsApp()
                    }}
                  >
                    ORDER ON WHATSAPP
                  </button>
                  <button type="button" className="fab-next-btn" onClick={finishQuote}>
                    SAVE PROJECT
                  </button>
                </div>
              </>
            ) : (
              <p className="form-error">Missing drawing details. Go back and complete Step 2.</p>
            )}
          </section>
        </main>
      ) : null}

      {view === 'subscriptions' ? (
        <main className="fab-home">
          <section className="fab-section">
            <div className="fab-title-row">
              <h1>Subscriptions</h1>
              {!subActive ? <span className="fab-freemium-sticker">$100/month</span> : null}
            </div>
            <p className="fab-note">
              The fabrication calculator is $100/month. It opens after payment, or during a 14 day free trial.
            </p>
            {!subActive ? (
              <p className="fab-freemium-meter" role="status">
                Pay $100 for 30 days, or go back to Buy CEO Website and start a 14 day free trial.
              </p>
            ) : (
              <p className="fab-freemium-meter fab-freemium-meter-active" role="status">
                {trialActive
                  ? `14 day trial active until ${new Date(Number(site?.trialUntil)).toLocaleDateString()}`
                  : `Active until ${new Date(Number(site?.paidUntil)).toLocaleDateString()}`}
              </p>
            )}
            {freemiumNote ? <p className="fab-freemium-alert">{freemiumNote}</p> : null}
            <div className="fab-subs">
              {FAB_PLANS.map((plan) => (
                <article key={plan.id}>
                  <strong>{plan.label}</strong>
                  <p>{formatPrice(plan.price)}</p>
                  <small>Unlimited drawings and gate quotes for 30 days</small>
                  {onRenew ? (
                    <button type="button" className="primary-button" onClick={() => onRenew(plan.id)}>
                      Pay with EcoCash
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : null}

      {view === 'pricing' ? (
        <main className="fab-home">
          <section className="fab-section">
            <h1>Price list</h1>
            <h2>Material rates</h2>
            <div className="fab-size-row">
              <label>
                50x50 / m
                <input
                  type="number"
                  value={priceForm.tube50PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, tube50PerM: event.target.value })}
                />
              </label>
              <label>
                25x25 / m
                <input
                  type="number"
                  value={priceForm.tube25PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, tube25PerM: event.target.value })}
                />
              </label>
            </div>
            <div className="fab-size-row">
              <label>
                16x16 / m
                <input
                  type="number"
                  value={priceForm.tube16PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, tube16PerM: event.target.value })}
                />
              </label>
              <label>
                76x76 post / m
                <input
                  type="number"
                  value={priceForm.tube76PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, tube76PerM: event.target.value })}
                />
              </label>
            </div>
            <div className="fab-size-row">
              <label>
                40×40 angle / m
                <input
                  type="number"
                  value={priceForm.angle40PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, angle40PerM: event.target.value })}
                />
              </label>
              <label>
                Flat bar / m
                <input
                  type="number"
                  value={priceForm.flatBarPerM}
                  onChange={(event) => setPriceForm({ ...priceForm, flatBarPerM: event.target.value })}
                />
              </label>
            </div>
            <div className="fab-size-row">
              <label>
                H 120x120 / m
                <input
                  type="number"
                  value={priceForm.h120PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, h120PerM: event.target.value })}
                />
              </label>
              <label>
                30×30 angle / m
                <input
                  type="number"
                  value={priceForm.angle30PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, angle30PerM: event.target.value })}
                />
              </label>
            </div>
            <div className="fab-size-row">
              <label>
                LC 150 / m
                <input
                  type="number"
                  value={priceForm.lc150PerM}
                  onChange={(event) => setPriceForm({ ...priceForm, lc150PerM: event.target.value })}
                />
              </label>
              <label>
                Labour %
                <input
                  type="number"
                  value={priceForm.labourPercent}
                  onChange={(event) => setPriceForm({ ...priceForm, labourPercent: event.target.value })}
                />
              </label>
            </div>
            <div className="fab-size-row">
              <label>
                Profit %
                <input
                  type="number"
                  value={priceForm.marginPercent}
                  onChange={(event) => setPriceForm({ ...priceForm, marginPercent: event.target.value })}
                />
              </label>
              <label>
                Consumables %
                <input
                  type="number"
                  value={priceForm.consumablesPercent}
                  onChange={(event) => setPriceForm({ ...priceForm, consumablesPercent: event.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onSavePricing?.(priceForm)
                goView('home')
              }}
            >
              Save price list
            </button>
          </section>
        </main>
      ) : null}

      {view === 'documents' ? (
        <main className="fab-home">
          <section className="fab-section">
            <h1>Documents</h1>
            <p className="fab-note">Finished quotations open offline. Uploading a new drawing still needs data.</p>
            {projects.length ? (
              <div className="fab-saved">
                {projects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="fab-saved-open"
                    onClick={() => openProject(item)}
                  >
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.client || '—'} · {jobTypeLabel(item.jobType, item.drawingType)}
                      </span>
                    </div>
                    <span>{formatPrice(item.quoteTotal)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-note">No saved projects yet.</p>
            )}
            <h2>Remembered drawing formulas</h2>
            <p className="fab-note">Saved drawings and formulas open offline. A new upload needs internet.</p>
            {loadDrawingTemplates().length ? (
              <div className="fab-saved">
                {loadDrawingTemplates().map((item) => (
                  <article key={item.fingerprint}>
                    <div>
                      <strong>{item.label || item.fileName}</strong>
                      <span>
                        {item.fileName} · {jobTypeLabel(item.jobType, item.drawingType)}
                      </span>
                    </div>
                    {item.preview ? (
                      <button
                        type="button"
                        className="fab-mini-preview"
                        onClick={() =>
                          setDrawingViewer({ src: item.preview, name: item.fileName, kind: item.drawingKind || 'image' })
                        }
                      >
                        <img src={item.preview} alt="" />
                      </button>
                    ) : (
                      <span>Saved</span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-note">No remembered drawings yet. Complete Step 2 with an upload to save one.</p>
            )}
          </section>
        </main>
      ) : null}

      {drawingViewer ? (
        <div className="fab-viewer-sheet" onClick={() => setDrawingViewer(null)}>
          <div className="fab-viewer" onClick={(event) => event.stopPropagation()}>
            <div className="fab-viewer-bar">
              <strong>{drawingViewer.name}</strong>
              <button type="button" className="text-back" onClick={() => setDrawingViewer(null)}>
                Close
              </button>
            </div>
            {drawingViewer.kind === 'pdf' ? (
              <iframe className="fab-viewer-frame" title={drawingViewer.name} src={drawingViewer.src} />
            ) : (
              <img className="fab-viewer-image" src={drawingViewer.src} alt={drawingViewer.name} />
            )}
            <a className="fab-next-btn fab-btn-outline" href={drawingViewer.src} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}


function GeneratedWebsite({
  site,
  onBack,
  initialProjectId = '',
  initialView = 'home',
  onMetadataUpdated,
}) {
  if (!site) {
    return (
      <div className="clone-app clone-rodcroft">
        <main className="clone-page">
          <h1>Website not found</h1>
          <p>This link does not match a website on this device.</p>
          <button type="button" className="clone-login-btn" onClick={onBack}>
            Back to Fortress
          </button>
        </main>
      </div>
    )
  }
  return (
    <CeoDashboard
      site={site}
      onBack={onBack}
      initialProjectId={initialProjectId}
      initialView={initialView}
      onMetadataUpdated={onMetadataUpdated}
    />
  )
}

function PublicCompanyProfile({
  company,
  comments = {},
  onClose,
  onOpenPost,
  onOpenPhoto,
  viewer,
  onAddComment,
  onReplyComment,
  onNeedAccount,
}) {
  const photo = company.profilePhoto || firstSlide(company)?.photo || ''
  const slides = company.slides || []

  return (
    <section className="detail-sheet public-profile-sheet" aria-label={`${company.name} profile`}>
      <button type="button" className="detail-close" onClick={onClose}>
        Close
      </button>
      <div className="profile-summary ig-profile-head public-profile-head">
        <button
          type="button"
          className="public-profile-avatar"
          onClick={() => photo && onOpenPhoto?.()}
          aria-label={`Open ${company.name} profile picture`}
        >
          {photo ? <img src={photo} alt="" /> : <span>{company.name.slice(0, 1)}</span>}
        </button>
        <div className="profile-copy">
          <h3>{company.name}</h3>
          {company.ceo ? <p>{company.ceo}</p> : null}
          <p>{company.category}</p>
          {company.location ? <p>{company.location}</p> : null}
          <StarRanking rating={company.rating} />
        </div>
      </div>
      <div className="gallery-grid">
        {slides.length ? (
          slides.map((slide, index) => (
            <button
              key={`${company.id}-grid-${index}`}
              type="button"
              className={`gallery-tile${slide.video ? ' is-reel' : ''}`}
              onClick={() => onOpenPost(index)}
            >
              {slide.video ? (
                <video src={slide.video} muted playsInline preload="metadata" />
              ) : (
                <img src={slide.photo} alt={slide.testimonial || `${company.name} photo ${index + 1}`} />
              )}
              {slide.video ? <span className="reel-mark">Reel</span> : null}
            </button>
          ))
        ) : (
          <p className="empty-note gallery-empty">No photos on this profile yet.</p>
        )}
      </div>
      <div className="public-comments">
        <h4>Comments</h4>
        {slides.map((slide, index) => (
          <div key={`${company.id}-thread-${index}`} className="public-post-comments">
            <button type="button" className="text-back" onClick={() => onOpenPost(index)}>
              {slide.testimonial ? slide.testimonial.slice(0, 72) : `Post ${index + 1}`}
            </button>
            <CommentThread
              targetId={`photo:${company.id}:${index}`}
              comments={comments}
              viewer={viewer}
              onAdd={onAddComment}
              onReply={onReplyComment}
              onNeedAccount={onNeedAccount}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

const seededAccountList = () =>
  withCompanyAccounts([
    makeAccount(OWNER_LOGIN.email, OWNER_LOGIN.password, '', { withWebsite: false }),
  ])

function App() {
  const [accounts, setAccounts] = useState(seededAccountList)
  const [signedInId, setSignedInId] = useState('')
  const [storageReady, setStorageReady] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState('')
  const [browserHost, setBrowserHost] = useState('')
  const [profileNameDraft, setProfileNameDraft] = useState({ id: '', name: null, ceo: null })
  const [tab, setTab] = useState('home')
  const [online, setOnline] = useState(true)
  const [offlineNotice, setOfflineNotice] = useState('')
  const [liveFeedItems, setLiveFeedItems] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [homeQuery, setHomeQuery] = useState('')
  const [comments, setComments] = useState(() => ({ ...DEMO_COMMENTS }))
  const [profileTab, setProfileTab] = useState('gallery')
  const [profileWebsitePreview, setProfileWebsitePreview] = useState(false)
  const [fabLaunchProject, setFabLaunchProject] = useState(null)
  const [ceoAppId, setCeoAppId] = useState('')
  const [compose, setCompose] = useState({
    mode: '',
    photo: '',
    caption: '',
    shelf: '',
    feePlan: '',
  })
  const [overlay, setOverlay] = useState(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [settingsView, setSettingsView] = useState('home')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [deleteAppId, setDeleteAppId] = useState('')
  const [deleteAppForm, setDeleteAppForm] = useState({ email: '', password: '' })
  const [deleteAppError, setDeleteAppError] = useState('')
  const [busyLabel, setBusyLabel] = useState('')
  const [systemType, setSystemType] = useState('')
  const [fabPlan, setFabPlan] = useState('month')
  const [dashCursor, setDashCursor] = useState(0)
  const [drawingDraft, setDrawingDraft] = useState(emptyDrawingDraft)
  const [fabPricing, setFabPricing] = useState(emptyFabPricing)
  const [ecocash, setEcocash] = useState({ number: '', password: '', name: '' })
  const [paymentNote, setPaymentNote] = useState('')
  const [websiteName, setWebsiteName] = useState('')
  const [websiteDomain, setWebsiteDomain] = useState('')
  const [domainEdited, setDomainEdited] = useState(false)
  const [purchaseMode, setPurchaseMode] = useState('buy')
  const [reactivateSiteId, setReactivateSiteId] = useState('')
  const [websiteCeo, setWebsiteCeo] = useState('')
  const [websiteLocation, setWebsiteLocation] = useState('Harare, Zimbabwe')
  const [websiteProjectName, setWebsiteProjectName] = useState('')
  const [websiteAbout, setWebsiteAbout] = useState('')
  const [pendingSignup, setPendingSignup] = useState(null)
  const [appRoute, setAppRoute] = useState({ kind: '', slug: '', projectId: '', view: 'home' })

  const menuRef = useRef(null)
  const flowToken = useRef(0)
  const avatarMenuRef = useRef(null)
  const avatarInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const composeInputRef = useRef(null)
  const composeModeRef = useRef('')
  const fromHomeCardRef = useRef(false)
  const shopFlowRef = useRef(false)
  const skipShopChoiceRef = useRef(false)
  const cardBuyRef = useRef(false)
  const trialIntentRef = useRef(false)
  const drawingInputRef = useRef(null)
  const skipPushRef = useRef(false)
  const ignorePopRef = useRef(false)
  const lastPathRef = useRef(readHashPath())
  const navStackRef = useRef([readHashPath() || '/home'])
  const navIndexRef = useRef(0)
  const previewFrameRef = useRef(null)
  const siteStackRef = useRef([])
  const siteIndexRef = useRef(0)
  const [siteNavTick, setSiteNavTick] = useState(0)
  const [navTick, setNavTick] = useState(0)
  const findCompanyRef = useRef(() => null)
  const savedAccountsRef = useRef('')
  const profileSaveRef = useRef('')

  useEffect(() => {
    setAccounts((previous) => withOwnerLogin(previous))
  }, [])

  useEffect(() => {
    try {
      const savedAccounts = storage.getItem(STORE_KEY)
      if (savedAccounts) {
        const next = withCompanyAccounts(JSON.parse(savedAccounts))
        savedAccountsRef.current = JSON.stringify(next)
        setAccounts(next)
      }
    } catch {
      /* Keep the seeded companies if saved accounts cannot be read. */
    }
    try {
      const savedSession = storage.getItem(SESSION_KEY) || ''
      if (savedSession) setSignedInId(savedSession)
    } catch {
      /* Stay signed out. */
    }
    try {
      const savedComments = storage.getItem(COMMENTS_KEY)
      if (savedComments) setComments(withDemoComments(JSON.parse(savedComments)))
    } catch {
      /* Keep the demo comments. */
    }
    const feed = loadLiveFeedCache()
    if (feed.length) setLiveFeedItems(feed)
    setFabPricing(loadFabPricing())
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (profileTab === 'buy') setProfileTab('gallery')
  }, [profileTab])

  useEffect(() => {
    setBrowserHost(window.location.host)
  }, [])

  useEffect(() => {
    setProfileNameDraft({ id: activeProfileId, name: null, ceo: null })
  }, [activeProfileId])

  useEffect(() => {
    setProfileWebsitePreview(false)
  }, [activeProfileId, profileTab])

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return
    try {
      const serialized = JSON.stringify(accounts)
      if (serialized === savedAccountsRef.current) return
      savedAccountsRef.current = serialized
      storage.setItem(STORE_KEY, serialized)
    } catch {
      /* Photos stay on this session if the phone storage is full. */
    }
  }, [accounts, storageReady])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onStorage = (event) => {
      if (event.key !== STORE_KEY || !event.newValue) return
      if (event.newValue === savedAccountsRef.current) return
      try {
        const next = withCompanyAccounts(JSON.parse(event.newValue))
        const serialized = JSON.stringify(next)
        if (serialized === savedAccountsRef.current) return
        savedAccountsRef.current = serialized
        setAccounts(next)
      } catch {
        /* Ignore bad storage sync payloads. */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return
    storage.setItem(COMMENTS_KEY, JSON.stringify(comments))
  }, [comments, storageReady])

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return
    if (signedInId) storage.setItem(SESSION_KEY, signedInId)
    else storage.removeItem(SESSION_KEY)
  }, [signedInId, storageReady])

  const refreshLiveFeed = async () => {
    if (!readOnline()) {
      setLiveFeedItems(loadLiveFeedCache())
      return
    }
    try {
      const { items } = await fetchLiveFeed()
      setLiveFeedItems(items)
    } catch {
      setLiveFeedItems(loadLiveFeedCache())
    }
  }

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      setOfflineNotice('')
      refreshLiveFeed()
    }
    const goOffline = () => {
      setOnline(false)
    }
    setOnline(readOnline())
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    refreshLiveFeed()
    const timer = window.setInterval(() => {
      if (readOnline()) refreshLiveFeed()
    }, 45_000)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.clearInterval(timer)
    }
  }, [])

  const requireOnline = (action = NETWORK_ACTIONS.post) => {
    if (online || readOnline()) return true
    setOfflineNotice(offlineActionMessage(action))
    setMenuOpen(false)
    return false
  }

  const applyParsedRoute = (parsed) => {
    skipPushRef.current = true
    setTab(parsed.tab)
    if (parsed.tab === 'settings') setSettingsView(parsed.settingsView || 'home')
    else setSettingsView('home')
    setOverlay(parsed.overlay)
    setAppRoute(parsed.route || { kind: '', slug: '' })
    setMenuOpen(false)
  }

  useEffect(() => {
    const sync = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      const path = readHashPath()
      if (path === lastPathRef.current) return
      lastPathRef.current = path
      const stack = navStackRef.current
      const existing = stack.lastIndexOf(path)
      if (existing >= 0) navIndexRef.current = existing
      else {
        navStackRef.current = [...stack.slice(0, navIndexRef.current + 1), path]
        navIndexRef.current = navStackRef.current.length - 1
      }
      setNavTick((value) => value + 1)
      applyParsedRoute(parseHashPath(path, findCompanyRef.current))
    }
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    const initial = readHashPath()
    const initialSubdomain = detectActiveSubdomain()
    if (initialSubdomain) {
      setAppRoute({ kind: 'site', slug: initialSubdomain, projectId: '', view: 'home' })
    } else if (!window.location.hash || window.location.hash === '#') {
      history.replaceState({ fortress: true, path: '/home' }, '', '#/home')
      lastPathRef.current = '/home'
      navStackRef.current = ['/home']
      navIndexRef.current = 0
    } else {
      history.replaceState({ fortress: true, path: initial }, '', `#${initial}`)
      lastPathRef.current = initial
      navStackRef.current = [initial]
      navIndexRef.current = 0
      applyParsedRoute(parseHashPath(initial, findCompanyRef.current))
    }
    setNavTick((value) => value + 1)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target) &&
        !event.target.closest('.profile-avatar-button')
      ) {
        setAvatarMenuOpen(false)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  const signedInAccount = accounts.find((account) => account.id === signedInId) || null

  useEffect(() => {
    const now = Date.now()
    const expired = accounts.some((account) =>
      (account.websites || []).some(
        (site) =>
          !site.catalogId &&
          site.billingStatus === 'trial' &&
          Number(site.trialUntil) > 0 &&
          now > Number(site.trialUntil),
      ),
    )
    if (!expired) return
    setAccounts((previous) =>
      previous.map((account) => {
        let siteChanged = false
        const websites = (account.websites || []).map((site) => {
          if (site.catalogId || site.billingStatus !== 'trial') return site
          if (!(Number(site.trialUntil) > 0) || now <= Number(site.trialUntil)) return site
          siteChanged = true
          return { ...site, billingStatus: 'paused' }
        })
        return siteChanged ? { ...account, websites } : account
      }),
    )
  }, [accounts])

  useEffect(() => {
    if (signedInId && !signedInAccount) {
      setSignedInId('')
      setActiveProfileId('')
    }
  }, [signedInId, signedInAccount])

  useEffect(() => {
    if (!signedInAccount) {
      setActiveProfileId('')
      return
    }

    if (!activeProfileId || !signedInAccount.websites.some((site) => site.id === activeProfileId)) {
      setActiveProfileId(signedInAccount.websites[0]?.id || '')
    }
  }, [signedInAccount, activeProfileId])

  const currentProfile =
    signedInAccount?.websites.find((site) => site.id === activeProfileId) ||
    signedInAccount?.websites[0] ||
    null

  const visibleSiteLabel = (site) => {
    const label = subdomainLabelFor(site)
    if (label.startsWith('/') && browserHost) return `${browserHost}${label}`
    return label
  }

  useEffect(() => {
    if (!signedInAccount || !currentProfile) return
    const slug = currentProfile.slug || uniqueSlug(currentProfile.name, accounts)
    const nextLink = siteHref(slug)
    if (currentProfile.slug === slug && currentProfile.link === nextLink) return
    if (!currentProfile.slug || !currentProfile.link) {
      updateCurrentWebsite({ slug, link: nextLink })
    }
  }, [signedInAccount, currentProfile, accounts])

  useEffect(() => {
    if (!storageReady || signedInAccount) return
    const accountOverlays = [
      'own-photo',
      'own-post',
      'add-media',
      'best-selling-plans',
      'compose',
      'feature-ecocash',
      'feature-loading',
    ]
    if (overlay && accountOverlays.includes(overlay.type)) {
      setOverlay(null)
    }
    const guestSettings = ['create', 'loading', 'buy', 'system', 'ecocash', 'tailor', 'preview']
    const buying = overlay?.type === 'buy-system'
    if (tab === 'profile' && !buying) {
      setTab('login')
      pushPath('/login')
    }
    if (tab === 'settings' && !guestSettings.includes(settingsView) && !buying) {
      setTab('login')
      pushPath('/login')
    }
  }, [storageReady, signedInAccount, tab, settingsView, overlay, pendingSignup])

  useEffect(() => {
    if (PHASE1_COMPLETE) return
    if (tab === 'settings' && (settingsView === 'tailor' || settingsView === 'loading')) {
      setBusyLabel('')
      setSettingsView('ecocash')
      setPaymentNote(PHASE1_ECOCASH_NOTE)
      pushPath('/settings/ecocash', { replace: true })
    }
  }, [tab, settingsView])

  const builtCards = useMemo(
    () =>
      accounts.flatMap((account, accountIndex) =>
        account.websites.map((site) => {
          const slides = slidesForSite(site)
          const latest = slides[0]

          return {
            id: site.id,
            name: site.name,
            category: site.type || 'Business',
            shelf: site.shelf || 'New companies',
            rating: 5,
            hue: accountIndex % 2 === 0 ? '#ff7b54' : '#51b6a0',
            location: 'On Fortress',
            about: '',
            ceo: site.ceo || '',
            ceoTestimonial: '',
            slides,
            featured: slides.some((slide) => slide.photo || slide.video),
            video: latest?.video || '',
            videoCaption: latest?.video ? latest.testimonial : '',
            isShop: Boolean(site.isShop && site.systemType === 'retail'),
            slug: site.slug,
            link: site.link,
            systemType: site.systemType,
            catalogId: site.catalogId || '',
            items: site.items || [],
            cover: latest?.photo || site.profilePhoto || '',
            accountIndex,
            ownerId: account.id,
            kind: 'profile',
          }
        }),
      ),
    [accounts],
  )

  const featureCards = useMemo(
    () =>
      accounts.flatMap((account, accountIndex) =>
        account.websites.flatMap((site) =>
          (site.slides || []).map((slide, index) => ({
            id: `${site.id}-feat-${index}`,
            name: site.name,
            category: site.type || 'Business',
            shelf: slide.shelf || 'New companies',
            rating: 5,
            hue: accountIndex % 2 === 0 ? '#ff7b54' : '#51b6a0',
            slides: [slide],
            kind: 'feature',
          })),
        ),
      ),
    [accounts],
  )

  const liveCatalog = useMemo(() => {
    const owned = new Map()
    accounts.forEach((account) => {
      account.websites.forEach((site) => {
        if (site.catalogId) owned.set(site.catalogId, site)
      })
    })
    return catalog.map((company) => {
      const site = owned.get(company.id)
      if (!site) return company
      const slides = slidesForSite(site)
      const reel = slides.find((slide) => slide.video)
      return {
        ...company,
        name: site.name || company.name,
        ceo: site.ceo ?? company.ceo,
        about: company.about || '',
        ceoTestimonial: '',
        slides: slides.length ? slides : company.slides,
        video: reel?.video || company.video,
        videoCaption: reel?.testimonial || company.videoCaption,
      }
    })
  }, [accounts])

  findCompanyRef.current = (id) => {
    if (!id) return null
    return (
      liveCatalog.find((item) => item.id === id) ||
      builtCards.find((item) => item.id === id || item.catalogId === id) ||
      featureCards.find((item) => item.id === id) ||
      null
    )
  }

  const pushPath = (path, { replace = false } = {}) => {
    const next = path.startsWith('/') ? path : `/${path}`
    if (next === lastPathRef.current && !replace) return

    if (replace) {
      const stack = [...navStackRef.current]
      stack[navIndexRef.current] = next
      navStackRef.current = stack
    } else {
      const stack = navStackRef.current.slice(0, navIndexRef.current + 1)
      stack.push(next)
      navStackRef.current = stack
      navIndexRef.current = stack.length - 1
    }

    lastPathRef.current = next
    const url = `${window.location.pathname}${window.location.search}#${next}`
    if (replace) history.replaceState({ fortress: true, path: next }, '', url)
    else history.pushState({ fortress: true, path: next }, '', url)
    setNavTick((value) => value + 1)
  }

  const goAppHistory = (delta) => {
    const nextIndex = navIndexRef.current + delta
    if (nextIndex < 0 || nextIndex >= navStackRef.current.length) return
    const path = navStackRef.current[nextIndex]
    navIndexRef.current = nextIndex
    lastPathRef.current = path
    applyParsedRoute(parseHashPath(path, findCompanyRef.current))
    const url = `${window.location.pathname}${window.location.search}#${path}`
    // Keep the address bar in sync without depending on the browser stack,
    // which can be empty or out of sync after external / live-site opens.
    ignorePopRef.current = true
    history.replaceState({ fortress: true, path }, '', url)
    // Clear the ignore flag after any sync hashchange/popstate from replaceState.
    window.setTimeout(() => {
      ignorePopRef.current = false
    }, 0)
    setNavTick((value) => value + 1)
  }

  const noteSiteUrl = (href) => {
    if (!href || href === 'about:blank') return
    const stack = siteStackRef.current
    const index = siteIndexRef.current
    if (stack[index] === href) return
    if (index > 0 && stack[index - 1] === href) {
      siteIndexRef.current = index - 1
    } else if (index < stack.length - 1 && stack[index + 1] === href) {
      siteIndexRef.current = index + 1
    } else {
      const next = stack.slice(0, index + 1)
      const previous = next[next.length - 1] || ''
      if (/\/login\.html(?:\?|$)/.test(previous) && !/\/login\.html(?:\?|$)/.test(href)) {
        next[next.length - 1] = href
      } else {
        next.push(href)
      }
      siteStackRef.current = next
      siteIndexRef.current = next.length - 1
    }
    setSiteNavTick((value) => value + 1)
  }

  const hookSiteFrame = (frame) => {
    const win = frame?.contentWindow
    if (!win || win.__fortressSiteHistory) return
    try {
      win.__fortressSiteHistory = true
      const { pushState, replaceState } = win.history
      win.history.pushState = function (...args) {
        const result = pushState.apply(this, args)
        noteSiteUrl(win.location.href)
        return result
      }
      win.history.replaceState = function (...args) {
        const result = replaceState.apply(this, args)
        const href = win.location.href
        const current = siteStackRef.current[siteIndexRef.current]
        if (current && current !== href) {
          const next = siteStackRef.current.slice()
          next[siteIndexRef.current] = href
          siteStackRef.current = next
          setSiteNavTick((value) => value + 1)
        }
        return result
      }
      win.addEventListener('hashchange', () => noteSiteUrl(win.location.href))
      win.addEventListener('popstate', () => noteSiteUrl(win.location.href))
    } catch {
      /* The frame is not readable from this page. */
    }
  }

  const onSiteFrameLoad = (event) => {
    const frame = event.currentTarget
    hookSiteFrame(frame)
    try {
      noteSiteUrl(frame.contentWindow?.location?.href || '')
    } catch {
      /* Cross-origin frame. */
    }
  }

  const goSiteHistory = (delta) => {
    const nextIndex = siteIndexRef.current + delta
    const stack = siteStackRef.current
    if (nextIndex < 0 || nextIndex >= stack.length) return
    const href = stack[nextIndex]
    siteIndexRef.current = nextIndex
    setSiteNavTick((value) => value + 1)
    const frame = previewFrameRef.current
    if (!frame) return
    try {
      frame.contentWindow.location.href = href
    } catch {
      frame.src = href
    }
  }

  const canGoBack = navIndexRef.current > 0
  const canGoForward = navIndexRef.current < navStackRef.current.length - 1
  void navTick
  void siteNavTick

  const historyNavProps = {
    canHistoryBack: canGoBack,
    canHistoryForward: canGoForward,
    onHistoryBack: () => goAppHistory(-1),
    onHistoryForward: () => goAppHistory(1),
  }

  const navigateApp = (path, { replace = false } = {}) => {
    const next = path.startsWith('/') ? path : `/${path}`
    const parsed = parseHashPath(next, findCompanyRef.current)
    applyParsedRoute(parsed)
    pushPath(next, { replace })
  }

  const goSettingsView = (view, { replace = false } = {}) => {
    setSettingsView(view)
    pushPath(!view || view === 'home' ? '/settings' : `/settings/${view}`, { replace })
  }

  const privateSystems = (signedInAccount?.websites || []).filter((site) =>
    ['construction', 'manufacturing', 'fabrication'].includes(site.systemType),
  )
  const dashSite =
    privateSystems.find((site) => site.id === currentProfile?.id) ||
    privateSystems[dashCursor % Math.max(privateSystems.length, 1)] ||
    null
  const rodcroftCeoSite = privateSystems.find((site) => {
    const key = String(site.slug || site.catalogId || '').replace(/^site-/, '').toLowerCase()
    return key === 'rodcroft'
  })
  const ceoActiveSite =
    privateSystems.find((site) => site.id === ceoAppId) || rodcroftCeoSite || dashSite || currentProfile
  const ceoPreviewSlug = cleanSlug(
    String(ceoActiveSite?.slug || ceoActiveSite?.catalogId || '').replace(/^site-/, ''),
  )
  const ceoWebsitePreviewOpen =
    Boolean(profileWebsitePreview && ceoActiveSite && !siteTrialEnded(ceoActiveSite)) &&
    (ceoPreviewSlug === 'rodcroft' || ceoPreviewSlug === 'prixburg')

  useEffect(() => {
    if (ceoWebsitePreviewOpen) return
    siteStackRef.current = []
    siteIndexRef.current = 0
    setSiteNavTick((value) => value + 1)
  }, [ceoWebsitePreviewOpen])
  const switchAccounts = signedInAccount
    ? accounts.filter(
        (account) =>
          account.id === signedInAccount.id ||
          (signedInAccount.linkedAccountIds || []).includes(account.id),
      )
    : []

  const companyMatchesQuery = (company, query) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    const text = [
      company.name,
      company.category,
      company.shelf,
      ...(company.slides || []).map((slide) => slide.testimonial || ''),
    ]
      .join(' ')
      .toLowerCase()
    return text.includes(needle)
  }

  const bestSelling = [
    ...liveCatalog.filter((company) => company.shelf === 'Best selling' && company.slides?.[0]),
    ...featureCards.filter((company) => company.shelf === 'Best selling'),
  ].filter((company) => companyMatchesQuery(company, homeQuery))

  const homeGridCards = useMemo(() => {
    const extras = builtCards.filter(
      (company) =>
        company.featured &&
        !company.catalogId &&
        !liveCatalog.some((item) => item.id === company.id || item.name === company.name),
    )
    const showcase = liveCatalog.filter((company) => company.showOnGrid)
    const rest = liveCatalog.filter((company) => company.shelf !== 'Best selling' && !company.showOnGrid)
    const liveCards = (liveFeedItems || [])
      .filter((row) => row?.photo || row?.video || row?.caption)
      .map((row) => ({
        id: `live-${row.id}`,
        name: row.authorName || 'Live upload',
        hue: '#c5a028',
        shelf: 'Live',
        showOnGrid: true,
        liveRemote: true,
        slides: [
          {
            id: row.id,
            photo: row.photo || '',
            video: row.video || '',
            testimonial: row.caption || '',
            shelf: row.shelf || 'Live',
          },
        ],
      }))
    return [...liveCards, ...showcase, ...rest, ...extras].filter((company) =>
      companyMatchesQuery(company, homeQuery),
    )
  }, [builtCards, homeQuery, liveCatalog, liveFeedItems])

  const updateCurrentWebsite = (updates) => {
    if (!signedInAccount || !currentProfile) return

    const profileId = currentProfile.id
    const accountId = signedInAccount.id
    setAccounts((previous) =>
      previous.map((account) => {
        if (account.id !== accountId) return account

        return {
          ...account,
          websites: (account.websites || []).map((site) => {
            if (site.id !== profileId) return site
            const next = { ...site, ...updates }
            if (Object.prototype.hasOwnProperty.call(updates, 'ceo')) next.ceoEdited = true
            if (Object.prototype.hasOwnProperty.call(updates, 'name')) next.nameEdited = true
            return next
          }),
        }
      }),
    )
    if (Object.prototype.hasOwnProperty.call(updates, 'ceo') || Object.prototype.hasOwnProperty.call(updates, 'name')) {
      const meta = getSiteCeoMetadata(currentProfile)
      saveSiteCeoMetadata(currentProfile, {
        ...meta,
        ...(Object.prototype.hasOwnProperty.call(updates, 'name')
          ? { companyName: updates.name, brandName: updates.name }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(updates, 'ceo') ? { ceo: updates.ceo } : {}),
      })
    }
  }

  useEffect(() => {
    if (!currentProfile || profileNameDraft.id !== currentProfile.id) return
    const updates = {}
    if (profileNameDraft.name != null && profileNameDraft.name !== (currentProfile.name || '')) {
      updates.name = profileNameDraft.name
    }
    if (profileNameDraft.ceo != null && profileNameDraft.ceo !== (currentProfile.ceo || '')) {
      updates.ceo = profileNameDraft.ceo
    }
    if (updates.name == null && updates.ceo == null) return
    const signature = `${currentProfile.id}:${updates.name ?? ''}:${updates.ceo ?? ''}`
    if (profileSaveRef.current === signature) return
    profileSaveRef.current = signature
    updateCurrentWebsite(updates)
  }, [profileNameDraft, currentProfile])

  const openSettingsPage = (view = 'home') => {
    setTab('settings')
    setSettingsView(view)
    setMenuOpen(false)
    setOverlay(null)
    setAuthError('')
    pushPath(view && view !== 'home' ? `/settings/${view}` : '/settings')
  }

  const handleCreateAccount = (event) => {
    event.preventDefault()
    const email = authForm.email.trim()
    const password = authForm.password

    if (!email || !password.trim()) {
      setAuthError('Enter your email and password.')
      return
    }
    if (accounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
      setAuthError('An account with that email already exists. Use Login.')
      return
    }

    const nextAccount = makeAccount(email, password, '', { withWebsite: false })
    setAccounts((previous) => [...previous, nextAccount])
    setSignedInId(nextAccount.id)
    setActiveProfileId(nextAccount.websites[0]?.id || '')
    setPendingSignup(null)
    setAuthForm({ email: '', password: '' })
    setAuthError('')
    setMenuOpen(false)
    setOverlay(null)
    setSystemType('')
    shopFlowRef.current = false
    skipShopChoiceRef.current = false
    cardBuyRef.current = false
    fromHomeCardRef.current = false
    setSettingsView('home')
    setProfileTab('gallery')
    setTab('profile')
    setAppRoute({ kind: '', slug: '' })
    pushPath('/profile')
  }

  const finishLogin = (account) => {
    setSignedInId(account.id)
    setActiveProfileId(account.websites[0]?.id || '')
    setAuthForm({ email: '', password: '' })
    setAuthError('')
    setMenuOpen(false)
    setOverlay(null)
    if (trialIntentRef.current || purchaseMode === 'trial') {
      trialIntentRef.current = false
      setPurchaseMode('trial')
      setTab('settings')
      goSettingsView('system')
      return
    }
    if (cardBuyRef.current || shopFlowRef.current) {
      setTab('settings')
      goSettingsView('shop-account')
      return
    }
    setTab('home')
    setSettingsView('home')
    pushPath('/home')
  }

  const handleLogin = (event) => {
    event.preventDefault()
    const email = authForm.email.trim()
    const password = authForm.password
    if (!email || !password.trim()) {
      setAuthError('Enter your email and password.')
      return
    }
    const existing = accounts.find((account) => account.email.toLowerCase() === email.toLowerCase())
    if (!existing || existing.password !== password) {
      setAuthError('That email or password does not match an account.')
      return
    }
    finishLogin(existing)
  }

  const handleAddAccount = (event) => {
    event.preventDefault()
    const email = authForm.email.trim()
    const password = authForm.password

    if (!signedInAccount) {
      setAuthError('Sign in before adding another account.')
      return
    }
    if (!email || !password.trim()) {
      setAuthError('Enter the email and password.')
      return
    }
    if (email.toLowerCase() === signedInAccount.email.toLowerCase()) {
      setAuthError('That is already this account.')
      return
    }
    if (accounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
      setAuthError('That email is already used. Enter a new email to create an account.')
      return
    }

    const nextAccount = {
      ...makeAccount(email, password, '', { withWebsite: false }),
      linkedAccountIds: [signedInAccount.id],
    }
    setAccounts((previous) =>
      previous
        .map((account) => {
          if (account.id !== signedInAccount.id) return account
          const linked = new Set(account.linkedAccountIds || [])
          linked.add(nextAccount.id)
          return { ...account, linkedAccountIds: [...linked] }
        })
        .concat(nextAccount),
    )
    setAuthForm({ email: '', password: '' })
    setAuthError('')
    setMenuOpen(false)
    setOverlay(null)
    setSettingsView('home')
    setTab('settings')
    pushPath('/settings')
  }

  const requestDeleteApplication = (siteId) => {
    setDeleteAppId(siteId)
    setDeleteAppForm({ email: '', password: '' })
    setDeleteAppError('')
  }

  const cancelDeleteApplication = () => {
    setDeleteAppId('')
    setDeleteAppForm({ email: '', password: '' })
    setDeleteAppError('')
  }

  const confirmDeleteApplication = (event) => {
    event.preventDefault()
    if (!signedInAccount || !deleteAppId) return
    const site = signedInAccount.websites.find((item) => item.id === deleteAppId)
    if (!site) {
      cancelDeleteApplication()
      return
    }
    const email = deleteAppForm.email.trim()
    const password = deleteAppForm.password
    if (!email || !password) {
      setDeleteAppError('Enter this account’s email and password to delete the app.')
      return
    }
    if (email.toLowerCase() !== signedInAccount.email.toLowerCase() || password !== signedInAccount.password) {
      setDeleteAppError('Those credentials do not match this account. The app was not deleted.')
      return
    }
    const siteId = deleteAppId
    setAccounts((previous) =>
      previous.map((account) => {
        if (account.id !== signedInAccount.id) return account
        return {
          ...account,
          websites: (account.websites || []).filter((item) => item.id !== siteId),
        }
      }),
    )
    if (activeProfileId === siteId) {
      const nextSite = signedInAccount.websites.find((item) => item.id !== siteId)
      setActiveProfileId(nextSite?.id || '')
    }
    if (ceoAppId === siteId) setCeoAppId('')
    cancelDeleteApplication()
  }

  const approvePayment = (event) => {
    event.preventDefault()
    if (!requireOnline(NETWORK_ACTIONS.pay)) {
      setPaymentNote(offlineActionMessage(NETWORK_ACTIONS.pay))
      return
    }
    if (!PHASE1_COMPLETE) {
      setPaymentNote(PHASE1_ECOCASH_NOTE)
      return
    }
    const number = ecocash.number.replace(/\s/g, '')
    const name = ecocash.name.trim()
    const password = ecocash.password

    if (!/^07\d{8}$/.test(number)) {
      setPaymentNote('Enter your 10-digit EcoCash number starting with 07.')
      return
    }
    if (!password.trim()) {
      setPaymentNote('Enter the EcoCash password.')
      return
    }
    if (!name) {
      setPaymentNote('Enter the name on EcoCash.')
      return
    }

    const token = flowToken.current + 1
    flowToken.current = token
    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    setBusyLabel('Approving payment…')
    goSettingsView('loading', { replace: true })

    const payingSiteId = purchaseMode === 'reactivate' ? reactivateSiteId : ''
    const payingAccountId = signedInAccount?.id || ''
    window.setTimeout(() => {
      if (flowToken.current !== token) return
      setBusyLabel('')
      if (payingSiteId && payingAccountId) {
        setAccounts((previous) =>
          previous.map((account) => {
            if (account.id !== payingAccountId) return account
            return {
              ...account,
              websites: (account.websites || []).map((site) =>
                site.id === payingSiteId
                  ? { ...site, billingStatus: 'paid', trialUntil: 0, paidUntil: Date.now() + 30 * 86400000 }
                  : site,
              ),
            }
          }),
        )
        setPurchaseMode('buy')
        setReactivateSiteId('')
        setCeoAppId(payingSiteId)
        setActiveProfileId(payingSiteId)
        setPaymentNote('')
        setProfileWebsitePreview(true)
        setProfileTab('dash')
        setTab('profile')
        setSettingsView('home')
        pushPath('/profile')
        return
      }
      setPaymentNote('Payment approved')
      goSettingsView('tailor')
    }, 900)
  }

  const createGeneratedWebsite = (event) => {
    event.preventDefault()
    const name = websiteName.trim()
    const type = SYSTEM_TYPES.find((item) => item.id === systemType) || SYSTEM_TYPES[1]
    if (!name || !type) return
    if (!signedInAccount && !pendingSignup) return

    const isFabrication = type.id === 'fabrication'
    const isTrial = purchaseMode === 'trial'
    const plan = FAB_PLANS.find((item) => item.id === fabPlan) || FAB_PLANS[0]
    const slides = type.id === 'construction' || type.id === 'manufacturing' ? type.slides : []
    const [first, ...rest] = slides
    const slug = uniqueSlug(isTrial ? websiteDomain.trim() || name : name, accounts)
    const ceoName = websiteCeo.trim() || currentProfile?.ceo || ''
    const locName = websiteLocation.trim() || 'Harare, Zimbabwe'
    const initialProjTitle = websiteProjectName.trim()
    const aboutText = websiteAbout.trim()

    if (!isFabrication) {
      const initialMeta = buildDefaultTemplateMetadata({
        slug,
        name,
        ceo: ceoName,
        location: locName,
        about: aboutText,
        systemType: type.id,
        emptyData: true,
      })
      saveSiteCeoMetadata(slug, initialMeta)
    }

    const site = makeWebsite({
      name,
      type: type.label,
      systemType: type.id,
      slug,
      link: siteHref(slug),
      profilePhoto: first?.photo || '',
      testimonial: first?.testimonial || type.how,
      gallery: rest.map((slide) => slide.photo).filter(Boolean),
      photoCaptions: rest.map((slide) => slide.testimonial),
      slides,
      isShop: false,
      items: [],
      brandName: name,
      cssName: slugify(name).replace(/-/g, ''),
      fabPlan: isFabrication ? plan.id : '',
      paidUntil: isTrial ? 0 : isFabrication ? Date.now() + plan.days * 86400000 : 0,
      billingStatus: isTrial ? 'trial' : '',
      trialUntil: isTrial ? Date.now() + TRIAL_MS : 0,
      domain: slug,
      drawings: [],
      ceo: ceoName,
    })

    if (pendingSignup) {
      const nextAccount = {
        ...makeAccount(pendingSignup.email, pendingSignup.password, '', { withWebsite: false }),
        websites: [site],
      }
      setAccounts((previous) => [...previous, nextAccount])
      setSignedInId(nextAccount.id)
      setActiveProfileId(site.id)
      setPendingSignup(null)
    } else if (signedInAccount) {
      setAccounts((previous) =>
        previous.map((account) =>
          account.id === signedInAccount.id ? { ...account, websites: [...account.websites, site] } : account,
        ),
      )
      setActiveProfileId(site.id)
    }
    setCeoAppId(site.id)
    if (isFabrication && (isTrial || Number(site.paidUntil) > Date.now())) {
      setProfileWebsitePreview(true)
    }

    setWebsiteName('')
    setWebsiteDomain('')
    setDomainEdited(false)
    setPurchaseMode('buy')
    trialIntentRef.current = false
    setWebsiteCeo('')
    setWebsiteProjectName('')
    setWebsiteAbout('')
    setPaymentNote('')
    shopFlowRef.current = false
    skipShopChoiceRef.current = false
    cardBuyRef.current = false
    setSettingsView('home')
    setProfileTab('dash')
    setTab('profile')
    setMenuOpen(false)
    setOverlay({ type: 'live-link', site })
    pushPath('/profile/live')
    setSystemType('')
  }

  const deleteSignedInAccount = () => {
    if (!signedInAccount) return
    if (!confirmDeleteTwice(`${signedInAccount.email} and the websites on this account`)) return
    const removedId = signedInAccount.id
    setAccounts((previous) => previous.filter((account) => account.id !== removedId))
    setSignedInId('')
    setActiveProfileId('')
    goSettingsView('manage')
  }

  const emptyCompose = () => ({
    mode: '',
    photo: '',
    video: '',
    caption: '',
    shelf: '',
    feePlan: '',
    note: '',
  })

  const defaultAccountSite = (account) =>
    makeWebsite({
      name: String(account?.email || 'My company').split('@')[0] || 'My company',
      type: 'Business',
      systemType: '',
      gallery: [],
      slides: [],
    })

  const publishAccountSlide = (slide, extra = {}) => {
    if (!signedInAccount) return false
    let publishedId = ''
    setAccounts((previous) =>
      previous.map((account) => {
        if (account.id !== signedInAccount.id) return account
        const websites = account.websites?.length ? [...account.websites] : [defaultAccountSite(account)]
        const currentId = activeProfileId || websites[0]?.id
        const index = Math.max(
          0,
          websites.findIndex((site) => site.id === currentId),
        )
        const site = websites[index]
        publishedId = site.id
        const caption = slide.testimonial || ''
        websites[index] = {
          ...site,
          ...extra,
          slides: [slide, ...(site.slides || [])],
          gallery: slide.photo || slide.video ? [slide.photo || slide.video, ...(site.gallery || [])] : site.gallery || [],
          photoCaptions: slide.photo || slide.video ? [caption, ...(site.photoCaptions || [])] : site.photoCaptions || [],
          testimonial: caption || site.testimonial,
        }
        return { ...account, websites }
      }),
    )
    if (publishedId) setActiveProfileId(publishedId)
    // Share to the live feed so other online Fortress users see it (needs data).
    if (readOnline()) {
      publishLiveUpload(slide, signedInAccount)
        .then(() => refreshLiveFeed())
        .catch(() => {
          /* local post still saved; live share can retry when online */
        })
    }
    return true
  }

  const openAddMedia = () => {
    if (!requireOnline(NETWORK_ACTIONS.post)) return
    setCompose(emptyCompose())
    setOverlay({ type: 'add-media' })
    pushPath('/profile/add')
  }

  const startBestSellingPost = () => {
    if (!requireOnline(NETWORK_ACTIONS.post)) return
    setCompose({ ...emptyCompose(), mode: 'feature', shelf: 'Best selling' })
    setOverlay({ type: 'best-selling-plans' })
    pushPath('/profile/best-selling-plans')
  }

  const startGeneralPost = () => {
    if (!requireOnline(NETWORK_ACTIONS.post)) return
    composeModeRef.current = 'general'
    setCompose({ ...emptyCompose(), mode: 'general', shelf: 'General' })
    composeInputRef.current?.click()
  }

  const continueBestSellingPlan = () => {
    if (!compose.feePlan) return
    if (!requireOnline(NETWORK_ACTIONS.post)) return
    composeModeRef.current = 'feature'
    composeInputRef.current?.click()
  }

  const pickComposeFile = (mode) => {
    if (!requireOnline(NETWORK_ACTIONS.post)) return
    composeModeRef.current = mode
    setCompose((previous) => ({
      ...emptyCompose(),
      mode,
      shelf: previous.shelf || (mode === 'feature' ? 'Best selling' : mode === 'general' ? 'General' : ''),
      feePlan: previous.feePlan || '',
    }))
    composeInputRef.current?.click()
  }

  const handleComposeFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const mode = composeModeRef.current
    if (!file || !mode) return
    try {
      const media = await readMediaFile(file)
      setCompose((previous) => ({
        ...emptyCompose(),
        mode: previous.mode || mode,
        shelf: previous.shelf || (mode === 'feature' ? 'Best selling' : mode === 'general' ? 'General' : ''),
        feePlan: previous.feePlan || '',
        photo: media.kind === 'photo' ? media.src : '',
        video: media.kind === 'video' ? media.src : '',
      }))
      setOverlay({ type: 'compose' })
      pushPath('/profile/compose')
    } catch (error) {
      setCompose((previous) => ({
        ...emptyCompose(),
        mode: previous.mode || mode,
        shelf: previous.shelf || (mode === 'feature' ? 'Best selling' : mode === 'general' ? 'General' : ''),
        feePlan: previous.feePlan || '',
        note: error?.message || 'Could not read that photo or video.',
      }))
      setOverlay({ type: 'compose' })
      pushPath('/profile/compose')
    }
  }

  const composeSlide = () => {
    const caption = compose.caption.trim()
    if (compose.video) {
      return {
        video: compose.video,
        photo: '',
        testimonial: caption || 'Video from the company card.',
        shelf: compose.shelf || '',
        feePlan: compose.feePlan || '',
      }
    }
    if (!compose.photo) return null
    return {
      photo: compose.photo,
      testimonial: caption || 'Photo from the company card.',
      shelf: compose.shelf || '',
      feePlan: compose.feePlan || '',
    }
  }

  const publishFeaturePost = () => {
    const slide = composeSlide()
    if (!slide) return
    publishAccountSlide({
      ...slide,
      shelf: compose.shelf || 'General',
      testimonial: compose.caption.trim() || slide.testimonial,
    })
    setCompose(emptyCompose())
    setOverlay(null)
    setProfileTab('gallery')
    setTab('profile')
    pushPath('/profile')
  }

  const submitCompose = (event) => {
    event.preventDefault()
    if (!requireOnline(NETWORK_ACTIONS.post)) {
      setCompose((previous) => ({ ...previous, note: offlineActionMessage(NETWORK_ACTIONS.post) }))
      return
    }
    const slide = composeSlide()
    if (!slide) {
      setCompose((previous) => ({
        ...previous,
        note: previous.note || 'Choose a photo or video from your gallery.',
      }))
      return
    }

    if (compose.mode === 'general' || compose.mode === 'gallery') {
      publishAccountSlide({
        ...slide,
        shelf: 'General',
        testimonial: compose.caption.trim() || slide.testimonial,
      })
      setCompose(emptyCompose())
      setOverlay(null)
      setProfileTab('gallery')
      setTab('profile')
      pushPath('/profile')
      return
    }

    if (compose.mode !== 'feature') return
    if (compose.shelf !== 'Best selling' || !compose.feePlan) {
      setCompose((previous) => ({
        ...previous,
        note: 'Choose an exclusive Best selling plan first.',
      }))
      setOverlay({ type: 'best-selling-plans' })
      pushPath('/profile/best-selling-plans')
      return
    }

    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    setOverlay({ type: 'feature-ecocash' })
    pushPath('/profile/feature-pay')
  }

  const submitFeatureEcoCash = (event) => {
    event.preventDefault()
    if (!requireOnline(NETWORK_ACTIONS.pay)) {
      setPaymentNote(offlineActionMessage(NETWORK_ACTIONS.pay))
      return
    }
    if (!PHASE1_COMPLETE) {
      setPaymentNote(PHASE1_ECOCASH_NOTE)
      return
    }
    const number = ecocash.number.replace(/\s/g, '')
    const name = ecocash.name.trim()
    const password = ecocash.password

    if (!/^07\d{8}$/.test(number)) {
      setPaymentNote('Enter your 10-digit EcoCash number starting with 07.')
      return
    }
    if (!password.trim()) {
      setPaymentNote('Enter the EcoCash password.')
      return
    }
    if (!name) {
      setPaymentNote('Enter the name on EcoCash.')
      return
    }

    setPaymentNote('')
    setBusyLabel('Approving payment…')
    setOverlay({ type: 'feature-loading' })
    pushPath('/profile/feature-pay', { replace: true })
    window.setTimeout(() => {
      setBusyLabel('')
      setEcocash({ number: '', password: '', name: '' })
      publishFeaturePost()
    }, 900)
  }

  const handleAvatarSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const src = await readFileAsDataUrl(file)
    updateCurrentWebsite({
      profilePhoto: src,
      gallery: currentProfile?.gallery?.includes(src)
        ? currentProfile.gallery
        : [src, ...(currentProfile?.gallery || [])],
    })
    setAvatarMenuOpen(false)
    event.target.value = ''
  }

  const handleProfilePictureAction = async (action) => {
    if (action === 'view') {
      openOwnProfilePhoto()
      return
    }

    const target = {
      gallery: avatarInputRef,
      files: fileInputRef,
      camera: cameraInputRef,
    }[action]

    target?.current?.click()
    setAvatarMenuOpen(false)
  }

  const goLogin = () => {
    setTab('login')
    setMenuOpen(false)
    setOverlay(null)
    setPendingSignup(null)
    setAuthError('')
    setAuthForm({ email: '', password: '' })
    setAppRoute({ kind: '', slug: '' })
    pushPath('/login')
  }

  const logout = () => {
    setSignedInId('')
    setActiveProfileId('')
    setMenuOpen(false)
    setOverlay(null)
    setAuthForm({ email: '', password: '' })
    setAuthError('')
    setSettingsView('home')
    setProfileTab('gallery')
    shopFlowRef.current = false
    skipShopChoiceRef.current = false
    cardBuyRef.current = false
    setPendingSignup(null)
    setAppRoute({ kind: '', slug: '' })
    setTab('home')
    pushPath('/home')
  }

  const goTab = (nextTab) => {
    if (nextTab === 'logout') {
      logout()
      return
    }
    if (nextTab === 'login') {
      goLogin()
      return
    }
    if (nextTab === 'calc') {
      openCalc()
      return
    }
    if (nextTab === 'buy') {
      openBuyWebsite()
      return
    }
    if (!signedInAccount && (nextTab === 'profile' || nextTab === 'settings')) {
      goLogin()
      return
    }
    setTab(nextTab)
    setMenuOpen(false)
    setOverlay(null)
    setAppRoute({ kind: '', slug: '' })
    if (nextTab === 'settings') {
      flowToken.current += 1
      setBusyLabel('')
      setSettingsView('home')
    }
    pushPath(`/${nextTab}`)
  }

  const closeOverlay = () => {
    setOverlay(null)
    pushPath(pathFromNav({ tab, settingsView, overlay: null }))
  }

  const leavePublished = () => {
    if (typeof window !== 'undefined' && /^\/site\/[^/]+/i.test(window.location.pathname || '')) {
      window.location.assign('/#/home')
      return
    }
    setAppRoute({ kind: '', slug: '' })
    setTab('home')
    pushPath('/home')
  }

  const openGallery = (company, mediaSrc) => {
    const source =
      liveCatalog.find((item) => item.id === company.id || item.name === company.name) ||
      builtCards.find((item) => item.id === company.id || item.catalogId === company.id) ||
      company
    const opened = withVideoSlides(source)
    const startIndex = opened.slides?.findIndex((slide) => slide.photo === mediaSrc || slide.video === mediaSrc)
    setOverlay({
      type: 'gallery',
      company: opened,
      postIndex: startIndex >= 0 ? startIndex : 0,
    })
    pushPath(`/${tab}/card/${encodeId(source.id)}`)
  }

  const switchAccount = (accountId) => {
    const account = accounts.find((item) => item.id === accountId)
    if (!account) return
    setSignedInId(account.id)
    setActiveProfileId(account.websites[0]?.id || '')
    setOverlay(null)
    setMenuOpen(false)
  }

  const ownGalleryCompany = () => {
    if (!currentProfile) return null
    const slides = gallerySlides(currentProfile)
    return {
      id: currentProfile.id,
      name: currentProfile.name || 'My account',
      slides,
    }
  }

  const openOwnProfilePhoto = () => {
    const src = currentProfile?.profilePhoto || currentProfile?.gallery?.[0]
    if (!src) {
      setAvatarMenuOpen(true)
      return
    }
    setAvatarMenuOpen(false)
    setOverlay({
      type: 'own-photo',
      company: {
        id: currentProfile.id,
        name: currentProfile.name || 'My account',
        slides: [{ photo: src, testimonial: '' }],
      },
    })
    pushPath('/profile/photo')
  }

  const openOwnGalleryPost = (postIndex) => {
    const company = ownGalleryCompany()
    if (!company?.slides?.length) return
    const path = `/profile/post/${postIndex}`
    const url = `${window.location.pathname}${window.location.search}#${path}`
    const opened = typeof window !== 'undefined' ? window.open(url, '_blank') : null
    if (opened) return
    setOverlay({ type: 'own-post', postIndex })
    pushPath(path)
  }

  const viewCompanyProfile = (company) => {
    setOverlay({ type: 'profile', company, postIndex: null })
    pushPath(`/${tab}/card/${encodeId(company.id)}/profile`)
  }

  const openCompanyPost = (company, postIndex) => {
    setOverlay({ type: 'profile', company, postIndex })
    pushPath(`/${tab}/card/${encodeId(company.id)}/profile/${postIndex}`)
  }

  const closeCompanyPost = () => {
    if (!overlayCompany) return
    setOverlay({ type: 'profile', company: overlayCompany, postIndex: null })
    pushPath(`/${tab}/card/${encodeId(overlayCompany.id)}/profile`)
  }

  const startBuySystem = (company) => {
    const typeId = systemIdFromCompany(company)
    const type = SYSTEM_TYPES.find((item) => item.id === typeId) || SYSTEM_TYPES[0]
    cardBuyRef.current = true
    shopFlowRef.current = false
    skipShopChoiceRef.current = false
    setSystemType(type.id)
    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    setWebsiteName('')
    setAuthError('')
    setAuthForm({ email: '', password: '' })
    if (!signedInAccount) {
      goLogin()
      return
    }
    openSettingsPage('shop-account')
  }

  const chooseShopAccount = (choice) => {
    if (choice === 'new') {
      skipShopChoiceRef.current = true
      setAuthForm({ email: '', password: '' })
      setAuthError('')
      goSettingsView('create')
      return
    }
    skipShopChoiceRef.current = true
    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    goSettingsView('ecocash')
  }

  const continueFromSystem = (typeId) => {
    setSystemType(typeId)
    setPurchaseMode('buy')
    trialIntentRef.current = false
    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    shopFlowRef.current = false
    setOverlay(null)
    setMenuOpen(false)
    setTab('settings')
    goSettingsView('preview')
  }

  const startFreeTrial = () => {
    setPurchaseMode('trial')
    trialIntentRef.current = false
    setReactivateSiteId('')
    setWebsiteDomain('')
    setDomainEdited(false)
    setPaymentNote('')
    goSettingsView('tailor')
  }

  const continuePreview = () => {
    if (pendingSignup) {
      goSettingsView('ecocash')
      return
    }
    if (signedInAccount && !skipShopChoiceRef.current) {
      goSettingsView('shop-account')
      return
    }
    goSettingsView('ecocash')
  }

  const cancelPendingSignup = () => {
    const keepSession = Boolean(signedInAccount)
    setPendingSignup(null)
    setSystemType('')
    setOverlay(null)
    setWebsiteName('')
    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    if (keepSession) {
      setTab('settings')
      goSettingsView('manage')
      return
    }
    goLogin()
  }

  const openGeneratedSite = (site, projectId = '', view = 'home') => {
    if (!site) return
    const slug = cleanSlug(site.slug || site.catalogId || site.name || '')
    if (!slug) return
    setOverlay(null)
    const suffix = projectId
      ? `/${encodeURIComponent(projectId)}${view ? `/${encodeURIComponent(view)}` : ''}`
      : view && view !== 'home'
        ? `/all/${encodeURIComponent(view)}`
        : ''
    navigateApp(`/site/${slug}${suffix}`)
  }

  const updateWebsite = (siteId, updates) => {
    if (!signedInAccount || !siteId) return
    setAccounts((previous) =>
      previous.map((account) => {
        if (account.id !== signedInAccount.id) return account
        return {
          ...account,
          websites: account.websites.map((site) => (site.id === siteId ? { ...site, ...updates } : site)),
        }
      }),
    )
  }

  const openPrivateSystem = (site, projectId = '', view = 'home') => {
    if (!site) return
    setOverlay(null)
    if (siteTrialEnded(site)) {
      setCeoAppId(site.id)
      setActiveProfileId(site.id)
      setProfileWebsitePreview(false)
      setAppRoute({ kind: '', slug: '' })
      setTab('profile')
      setProfileTab('dash')
      pushPath('/profile')
      return
    }
    if (site.systemType === 'fabrication') {
      if (!fabAccessActive(site)) {
        subscribeToReactivate(site)
        return
      }
      setCeoAppId(site.id)
      setActiveProfileId(site.id)
      setProfileWebsitePreview(true)
      setAppRoute({ kind: '', slug: '' })
      setTab('profile')
      setProfileTab('dash')
      pushPath('/profile')
      return
    }
    openGeneratedSite(site, projectId, view)
  }

  const subscribeToReactivate = (site) => {
    if (!site) return
    setPurchaseMode('reactivate')
    setReactivateSiteId(site.id)
    setSystemType(site.systemType || 'construction')
    setEcocash({ number: '', password: '', name: '' })
    setPaymentNote('')
    setOverlay(null)
    setMenuOpen(false)
    setAppRoute({ kind: '', slug: '' })
    setTab('settings')
    goSettingsView('ecocash')
  }

  const openBuyWebsite = ({ trial = false } = {}) => {
    // Browse / open Buy CEO website UI offline; EcoCash pay still needs data later.
    trialIntentRef.current = trial
    setPurchaseMode(trial ? 'trial' : 'buy')
    setReactivateSiteId('')
    setOverlay(null)
    setMenuOpen(false)
    setPendingSignup(null)
    if (!signedInAccount) {
      goLogin()
      return
    }
    openSettingsPage('system')
  }

  const handleDrawingFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const photo = await readFileAsDataUrl(file)
    setDrawingDraft((previous) => ({ ...previous, photo }))
  }

  const openCalc = (site) => {
    const owned =
      site?.systemType === 'fabrication'
        ? site
        : signedInAccount?.websites.find((item) => item.systemType === 'fabrication')
    if (!fabAccessActive(owned)) {
      if (owned?.id) {
        subscribeToReactivate(owned)
        return
      }
      setSystemType('fabrication')
      setFabPlan('month')
      openBuyWebsite()
      return
    }
    setOverlay(null)
    setMenuOpen(false)
    setDrawingDraft(emptyDrawingDraft())
    if (owned?.slug) {
      navigateApp(`/site/${owned.slug}`)
      return
    }
    navigateApp('/calc')
  }

  const saveDrawing = (site) => {
    const quote = fabQuote(drawingDraft, fabPricing)
    if (!site?.id || !quote) return
    const drawing = {
      id: makeId('draw'),
      name: drawingDraft.name.trim() || quote.title,
      gateType: drawingDraft.gateType,
      design: drawingDraft.design,
      width: Number(drawingDraft.width),
      height: Number(drawingDraft.height),
      length: quote.L,
      materials: quote.materials,
      labour: quote.labour,
      consumables: quote.consumables,
      margin: quote.margin,
      quote: quote.total,
      at: Date.now(),
    }
    updateWebsite(site.id, { drawings: [drawing, ...(site.drawings || [])] })
  }

  const addComment = (targetId, text) => {
    if (!signedInAccount) return
    const entry = {
      id: makeId('comment'),
      authorId: signedInAccount.id,
      author: signedInAccount.email,
      text,
      replies: [],
    }
    setComments((previous) => ({
      ...previous,
      [targetId]: [...(previous[targetId] || []), entry],
    }))
  }

  const replyToComment = (targetId, commentId, text) => {
    if (!signedInAccount) return
    const reply = {
      id: makeId('reply'),
      authorId: signedInAccount.id,
      author: signedInAccount.email,
      text,
    }
    setComments((previous) => ({
      ...previous,
      [targetId]: (previous[targetId] || []).map((comment) =>
        comment.id === commentId ? { ...comment, replies: [...(comment.replies || []), reply] } : comment,
      ),
    }))
  }

  const needAccountForComment = () => {
    fromHomeCardRef.current = false
    goLogin()
  }

  const deleteOwnPhoto = (index) => {
    if (!currentProfile) return
    const posts = gallerySlides(currentProfile)
    const target = posts[index]
    if (!target) return
    if (!confirmDeleteTwice('this post')) return
    const src = target.photo || target.video
    updateCurrentWebsite({
      slides: (currentProfile.slides || []).filter(
        (slide, slideIndex) =>
          slideIndex !== index && slide.photo !== src && slide.video !== src,
      ),
      gallery: (currentProfile.gallery || []).filter((item) => item !== src),
      photoCaptions: (currentProfile.photoCaptions || []).filter((_, captionIndex) => captionIndex !== index),
      profilePhoto: currentProfile.profilePhoto === src ? '' : currentProfile.profilePhoto,
    })
    setOverlay(null)
    pushPath('/profile')
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      window.setTimeout(() => window.close(), 0)
    }
  }

  const updateOwnSlideCaption = (index, caption) => {
    if (!currentProfile) return
    const posts = gallerySlides(currentProfile)
    const target = posts[index]
    if (!target) return
    const nextCaption = String(caption ?? '')
    const src = target.photo || target.video || ''
    const baseSlides = currentProfile.slides?.length ? currentProfile.slides : posts
    const nextSlides = baseSlides.map((slide, slideIndex) => {
      const sameIndex = slideIndex === index
      const sameSrc = src && (slide.photo === src || slide.video === src)
      if (!sameIndex && !sameSrc) return slide
      return { ...slide, testimonial: nextCaption }
    })
    const nextCaptions = [...(currentProfile.photoCaptions || [])]
    while (nextCaptions.length < posts.length) nextCaptions.push('')
    nextCaptions[index] = nextCaption
    updateCurrentWebsite({
      slides: nextSlides,
      photoCaptions: nextCaptions,
    })
  }

  const ownPostCompany = (postIndex) => {
    if (!currentProfile) return null
    const posts = gallerySlides(currentProfile)
    const slide = posts[postIndex]
    if (!slide) return null
    return {
      id: currentProfile.id,
      name: currentProfile.name || 'My account',
      slides: [slide],
    }
  }

  const overlayCompany = overlay?.company
  const chosenSystem = SYSTEM_TYPES.find((item) => item.id === systemType) || null
  const publishedSite =
    appRoute.kind === 'site'
      ? accounts
          .flatMap((account) => account.websites)
          .find(
            (site) =>
              cleanSlug(site.slug || site.catalogId || site.name) === cleanSlug(appRoute.slug),
          ) ||
        (() => {
          const meta = getSiteCeoMetadata(appRoute.slug)
          if (!meta) return null
          return makeWebsite({
            id: `site-${meta.slug}`,
            name: meta.companyName || meta.slug,
            type: meta.systemType === 'manufacturing' ? 'Manufacturing' : 'Construction',
            systemType: meta.systemType || 'construction',
            slug: meta.slug,
            link: subdomainUrlFor(meta.slug),
            ceo: meta.ceo || '',
          })
        })()
      : null

  const calcSite =
    publishedSite?.systemType === 'fabrication'
      ? publishedSite
      : signedInAccount?.websites.find((item) => item.systemType === 'fabrication') || {
          id: '',
          name: 'Fabrication website',
          drawings: [],
        }

  const openFabPay = (planId) => {
    if (!requireOnline(NETWORK_ACTIONS.buy)) return
    setSystemType('fabrication')
    setFabPlan(planId || 'month')
    setAppRoute({ kind: '', slug: '' })
    setTab('settings')
    goSettingsView('preview')
  }

  const frozenPublished = siteTrialEnded(publishedSite)
    ? publishedSite
    : appRoute.kind === 'calc' && siteTrialEnded(calcSite)
      ? calcSite
      : null

  if (frozenPublished) {
    return (
      <div className="phone-app-shell">
        <div className="phone-frame">
          <main className="phone-content">
            <PausedTrial
              site={frozenPublished}
              onBack={leavePublished}
              onSubscribe={() => subscribeToReactivate(frozenPublished)}
            />
          </main>
        </div>
      </div>
    )
  }

  if (appRoute.kind === 'calc' || publishedSite?.systemType === 'fabrication') {
    const lockedSite = publishedSite?.systemType === 'fabrication' ? publishedSite : calcSite
    if (!fabAccessActive(lockedSite)) {
      return (
        <div className="phone-app-shell">
          <div className="phone-frame">
            <main className="phone-content">
              <section className="panel-box settings-page">
                <button type="button" className="text-back" onClick={leavePublished}>
                  Back
                </button>
                <h3>Fabrication website</h3>
                <p className="shop-copy">
                  This Zantac template website is $100/month. Pay first, or start a 14 day free trial from Buy CEO Website and use it until the trial ends.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => (lockedSite?.id ? subscribeToReactivate(lockedSite) : openBuyWebsite())}
                >
                  Buy with EcoCash
                </button>
              </section>
            </main>
          </div>
        </div>
      )
    }
    return (
      <FabricationCalculator
        site={calcSite}
        draft={drawingDraft}
        onChange={setDrawingDraft}
        onSave={calcSite.id ? () => saveDrawing(calcSite) : undefined}
        onRenew={openFabPay}
        onBack={leavePublished}
        pricing={fabPricing}
        routePanel={appRoute.panel || 'home'}
        onNavigate={navigateApp}
        {...historyNavProps}
        onSavePricing={(next) => {
          const merged = { ...emptyFabPricing(), ...next }
          delete merged.visionApiKey
          setFabPricing(merged)
          try {
            storage.setItem(PRICING_KEY, JSON.stringify(merged))
          } catch {
            /* ignore */
          }
        }}
      />
    )
  }

  if (appRoute.kind === 'site') {
    if (siteTrialEnded(publishedSite)) {
      return (
        <div className="phone-app-shell">
          <div className="phone-frame">
            <main className="phone-content">
              <PausedTrial
                site={publishedSite}
                onBack={leavePublished}
                onSubscribe={() => subscribeToReactivate(publishedSite)}
              />
            </main>
          </div>
        </div>
      )
    }
    const requestedProjectId =
      appRoute.projectId && appRoute.projectId !== 'all' ? appRoute.projectId : ''
    const requestedView = appRoute.view || 'home'
    return (
      <CeoDashboard
        site={publishedSite}
        initialProjectId={requestedProjectId}
        initialView={requestedView}
        onBack={() => {
          if (detectActiveSubdomain()) {
            const url = new URL(window.location.href)
            url.searchParams.delete('subdomain')
            url.searchParams.delete('site')
            url.hash = '#/home'
            window.history.pushState({}, '', url.toString())
          }
          leavePublished()
        }}
        onMetadataUpdated={(updatedMeta) => {
          if (publishedSite?.id && signedInAccount) {
            updateWebsite(publishedSite.id, {
              name: updatedMeta.companyName || publishedSite.name,
              ceo: updatedMeta.ceo ?? publishedSite.ceo,
            })
          }
        }}
      />
    )
  }

  return (
    <div className="phone-app-shell">
      <div className="phone-frame">
        <header className="phone-header">
          <div className="title-row">
            <div className="title-lead">
              <HistoryNav
                canBack={ceoWebsitePreviewOpen ? siteIndexRef.current > 0 : canGoBack}
                canForward={
                  ceoWebsitePreviewOpen
                    ? siteIndexRef.current < siteStackRef.current.length - 1
                    : canGoForward
                }
                onBack={() => (ceoWebsitePreviewOpen ? goSiteHistory(-1) : goAppHistory(-1))}
                onForward={() => (ceoWebsitePreviewOpen ? goSiteHistory(1) : goAppHistory(1))}
              />
              <div>
                <p className="eyebrow">Run sites from phone{online ? '' : ' · offline'}</p>
                <h1>Fortress</h1>
              </div>
            </div>
            <div className="menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="menu-button"
                aria-label="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ☰
              </button>
              {menuOpen && (
                <div className="header-menu">
                  {(signedInAccount ? [...NAV, { id: 'logout', label: 'Logout' }] : GUEST_NAV).map((item) => (
                    <MenuButton
                      key={item.id}
                      item={item}
                      active={item.id === 'calc' ? appRoute.kind === 'calc' : tab === item.id}
                      onSelect={goTab}
                      className={`${
                        (item.id === 'calc' ? appRoute.kind === 'calc' : tab === item.id) ? 'menu-link active' : 'menu-link'
                      }${item.id === 'logout' ? ' logout-link' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {!online || offlineNotice ? (
          <div className="app-offline-banner" role="status">
            <p>
              {!online
                ? 'Offline mode — open saved posts, sites, drawings, and photos on this device. Live uploads from other users, new posts, Fortress chat AI, payments, and app updates need internet data.'
                : offlineNotice}
            </p>
            {offlineNotice ? (
              <button type="button" className="text-back" onClick={() => setOfflineNotice('')}>
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}

        <main className="phone-content">
          {tab === 'home' && (
            <div className="store-home">
              <form className="store-search" role="search" onSubmit={(event) => event.preventDefault()}>
                <input
                  type="search"
                  value={homeQuery}
                  placeholder="Search a testimonial"
                  onChange={(event) => setHomeQuery(event.target.value)}
                />
              </form>
              {bestSelling.length > 0 ? <FeatureFlip companies={bestSelling} onOpen={openGallery} /> : (
                homeQuery.trim() ? <p className="empty-note">No testimonials match that search.</p> : null
              )}
              {homeGridCards.length > 0 ? (
                <div className="home-grid" aria-label="Company reels and testimonials">
                  {homeGridCards.flatMap((company, index) => {
                    const tiles = [
                      <HomeTile key={company.id} company={company} onOpen={openGallery} />,
                    ]
                    if ((index + 1) % 6 === 0) {
                      const ad = HOME_ADS[Math.floor(index / 6) % HOME_ADS.length]
                      tiles.push(
                        <button
                          key={ad.id + index}
                          type="button"
                          className="home-ad"
                          onClick={() => (ad.id === 'ad-fab' ? openCalc() : openBuyWebsite())}
                        >
                          <span>{ad.kicker}</span>
                          <strong>{ad.title}</strong>
                          <small>{ad.copy}</small>
                        </button>,
                      )
                    }
                    return tiles
                  })}
                </div>
              ) : null}
            </div>
          )}

          {tab === 'login' && (
            <section className="panel-box settings-page">
              <form className="create-account-form" onSubmit={handleLogin}>
                <h3>Login</h3>
                <p className="shop-copy">Enter your account email and password.</p>
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((value) => ({ ...value, email: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((value) => ({ ...value, password: event.target.value }))}
                  required
                />
                {authError && <p className="form-error">{authError}</p>}
                <button type="submit" className="primary-button">
                  Login
                </button>
              </form>
              <button
                type="button"
                className="text-back"
                onClick={() => {
                  setAuthError('')
                  setAuthForm({ email: '', password: '' })
                  openSettingsPage('create')
                }}
              >
                Create account
              </button>
            </section>
          )}

          {tab === 'profile' && !signedInAccount && (
            <section className="profile-panel">
              <div className="gate-copy">
                <h2>Create an account to view more</h2>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    fromHomeCardRef.current = false
                    openSettingsPage('create')
                  }}
                >
                  Create account
                </button>
              </div>
            </section>
          )}

          {tab === 'profile' && signedInAccount && ceoWebsitePreviewOpen && ceoPreviewSlug === 'rodcroft' && (
            <section className="profile-panel ceo-live-preview-panel">
              <div className="ceo-preview-bar">
                <button type="button" className="text-back" onClick={() => setProfileWebsitePreview(false)}>
                  ← Dashboard
                </button>
              </div>
              <iframe
                ref={previewFrameRef}
                className="ceo-live-site-frame"
                title="Rodcroft website"
                src={`/project/${RODCROFT_CHADCOMBE_PROJECT_ID}`}
                onLoad={onSiteFrameLoad}
              />
            </section>
          )}

          {tab === 'profile' && signedInAccount && ceoWebsitePreviewOpen && ceoPreviewSlug === 'prixburg' && (
            <section className="profile-panel ceo-live-preview-panel">
              <div className="ceo-preview-bar">
                <button type="button" className="text-back" onClick={() => setProfileWebsitePreview(false)}>
                  ← Dashboard
                </button>
              </div>
              <iframe
                ref={previewFrameRef}
                className="ceo-live-site-frame"
                title="Prixburg website"
                src="/prixburg-live/index.html"
                onLoad={onSiteFrameLoad}
              />
            </section>
          )}

          {tab === 'profile' && signedInAccount && !ceoWebsitePreviewOpen && (
            <section className="profile-panel">
              <div className="profile-summary ig-profile-head">
                <div className="profile-avatar-wrap" ref={avatarMenuRef}>
                  <button
                    type="button"
                    className="profile-avatar-button"
                    onClick={openOwnProfilePhoto}
                    aria-label="Open profile photo"
                  >
                    {currentProfile?.profilePhoto ? (
                      <img src={currentProfile.profilePhoto} alt="Profile" />
                    ) : (
                      <span>{(currentProfile?.name || signedInAccount.email)?.[0]?.toUpperCase() || 'F'}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="avatar-edit"
                    onClick={() => setAvatarMenuOpen((value) => !value)}
                  >
                    Edit
                  </button>

                  {avatarMenuOpen && (
                    <div className="avatar-menu">
                      <button type="button" onClick={() => handleProfilePictureAction('view')}>
                        View profile picture
                      </button>
                      <button type="button" onClick={() => handleProfilePictureAction('gallery')}>
                        Open gallery
                      </button>
                      <button type="button" onClick={() => handleProfilePictureAction('files')}>
                        Files
                      </button>
                      <button type="button" onClick={() => handleProfilePictureAction('camera')}>
                        Take a photo
                      </button>
                    </div>
                  )}

                  <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarSelect} />
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarSelect} />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handleAvatarSelect}
                  />
                </div>

                <div className="profile-copy">
                  <h3>{currentProfile?.name || 'My account'}</h3>
                  <p>{signedInAccount.email}</p>
                </div>
              </div>

              {privateSystems.length ? (
                privateSystems.map((site, index) => {
                  const slug = cleanSlug(site.slug || site.catalogId || site.name || '')
                  const onAppPath = slug !== 'rodcroft' && slug !== 'prixburg'
                  const label = `${index + 1}) ${visibleSiteLabel(site)}${
                    site.systemType === 'fabrication' ? ' — Fabrication website' : ''
                  }`
                  if (onAppPath) {
                    return (
                      <a key={site.id} className="profile-live-link" href={`/site/${slug}`}>
                        {label}
                      </a>
                    )
                  }
                  return (
                    <button
                      key={site.id}
                      type="button"
                      className="profile-live-link"
                      onClick={() => openPrivateSystem(site)}
                    >
                      {label}
                    </button>
                  )
                })
              ) : (
                <p className="profile-live-link muted">
                  Your private system link appears here after you buy a website. Other people cannot see it.
                </p>
              )}

              {currentProfile && signedInAccount.websites.length > 1 && (
                <div className="profile-switcher highlight-row">
                  {signedInAccount.websites.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      className={site.id === currentProfile.id ? 'highlight-dot active' : 'highlight-dot'}
                      onClick={() => setActiveProfileId(site.id)}
                      aria-label={site.name}
                    >
                      {(site.name || 'S')[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {currentProfile ? (
                <form className="profile-form company-edit-form" onSubmit={(event) => event.preventDefault()}>
                  <label>
                    Company name
                    <input
                      type="text"
                      value={
                        profileNameDraft.id === currentProfile.id && profileNameDraft.name != null
                          ? profileNameDraft.name
                          : currentProfile.name || ''
                      }
                      onChange={(event) => {
                        const name = event.target.value
                        setProfileNameDraft((draft) => ({
                          id: currentProfile.id,
                          name,
                          ceo: draft.id === currentProfile.id ? draft.ceo : null,
                        }))
                        updateCurrentWebsite({ name })
                      }}
                    />
                  </label>
                  <label>
                    CEO name
                    <input
                      type="text"
                      value={
                        profileNameDraft.id === currentProfile.id && profileNameDraft.ceo != null
                          ? profileNameDraft.ceo
                          : currentProfile.ceo || ''
                      }
                      placeholder="CEO name"
                      onChange={(event) => {
                        const ceo = event.target.value
                        setProfileNameDraft((draft) => ({
                          id: currentProfile.id,
                          name: draft.id === currentProfile.id ? draft.name : null,
                          ceo,
                        }))
                        updateCurrentWebsite({ ceo })
                      }}
                    />
                  </label>
                </form>
              ) : null}

              <div className={`ig-tabs${privateSystems.length ? ' has-dash' : ''}`} role="tablist" aria-label="Profile sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={profileTab === 'gallery'}
                  className={profileTab === 'gallery' ? 'ig-tab active' : 'ig-tab'}
                  onClick={() => setProfileTab('gallery')}
                  aria-label="Gallery"
                >
                  <IconGrid />
                  <span className="ig-tab-label">Gallery</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={profileTab === 'dash'}
                  className={profileTab === 'dash' ? 'ig-tab active' : 'ig-tab'}
                  onClick={() => setProfileTab('dash')}
                  aria-label="CEO dashboards"
                >
                  <IconCompanyTab />
                  <span className="ig-tab-label">
                    {(dashSite || currentProfile)?.systemType === 'manufacturing'
                      ? 'CEO Analysis'
                      : (dashSite || currentProfile)?.systemType === 'fabrication'
                        ? 'Projects'
                        : 'Engineering'}
                  </span>
                </button>
              </div>

              {profileTab === 'gallery' && (
                <div className="gallery-grid">
                  {gallerySlides(currentProfile).length ? (
                    gallerySlides(currentProfile).map((slide, index) => (
                      <button
                        key={`${slide.video || slide.photo || 'post'}-${index}`}
                        type="button"
                        className={`gallery-tile${slide.video ? ' is-reel' : ''}`}
                        onClick={() => openOwnGalleryPost(index)}
                      >
                        {slide.video ? (
                          <video src={slide.video} muted playsInline preload="metadata" />
                        ) : (
                          <img src={slide.photo} alt={slide.testimonial || `Gallery ${index + 1}`} />
                        )}
                        {slide.video ? <span className="reel-mark">Reel</span> : null}
                      </button>
                    ))
                  ) : (
                    <p className="empty-note gallery-empty">Tap + to add a photo or video from your gallery.</p>
                  )}
                </div>
              )}

              {profileTab === 'dash' && (
                <div className="profile-tab-panel">
                  {ceoActiveSite && siteTrialEnded(ceoActiveSite) ? (
                    <PausedTrial
                      site={ceoActiveSite}
                      onSubscribe={() => subscribeToReactivate(ceoActiveSite)}
                    />
                  ) : profileWebsitePreview && ceoActiveSite ? (
                    <div className="ceo-website-preview">
                      <p className="shop-copy ceo-preview-note">
                        Preview of {ceoActiveSite.name}, the same site a worker opens.
                      </p>
                      {ceoActiveSite.systemType === 'fabrication' ? (
                        fabAccessActive(ceoActiveSite) ? (
                        <FabricationCalculator
                          site={ceoActiveSite}
                          draft={drawingDraft}
                          onChange={setDrawingDraft}
                          onSave={ceoActiveSite.id ? () => saveDrawing(ceoActiveSite) : undefined}
                          onRenew={openFabPay}
                          onBack={() => setProfileWebsitePreview(false)}
                          backLabel="Dashboard"
                          pricing={fabPricing}
                          routePanel="home"
                          initialProject={fabLaunchProject}
                          onNavigate={() => {}}
                          {...historyNavProps}
                          onSavePricing={(next) => {
                            const merged = { ...emptyFabPricing(), ...next }
                            delete merged.visionApiKey
                            setFabPricing(merged)
                            try {
                              storage.setItem(PRICING_KEY, JSON.stringify(merged))
                            } catch {
                              /* ignore */
                            }
                          }}
                        />
                        ) : (
                          <section className="panel-box">
                            <h3>Fabrication website</h3>
                            <p className="shop-copy">
                              This Zantac template website is $100/month. Pay first, or start a 14 day free trial and use it until the trial ends.
                            </p>
                            <button type="button" className="primary-button" onClick={() => subscribeToReactivate(ceoActiveSite)}>
                              Buy with EcoCash
                            </button>
                          </section>
                        )
                      ) : (
                        <CeoDashboard
                          site={ceoActiveSite}
                          embedded
                          initialView="home"
                          onBack={() => setProfileWebsitePreview(false)}
                          backLabel="← Dashboard"
                          onMetadataUpdated={(updatedMeta) => {
                            if (ceoActiveSite?.id && signedInAccount) {
                              updateWebsite(ceoActiveSite.id, {
                                name: updatedMeta.companyName || ceoActiveSite.name,
                                ceo: updatedMeta.ceo ?? ceoActiveSite.ceo,
                              })
                            }
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <CeoProjectsOverview
                      sites={privateSystems.length ? privateSystems : currentProfile ? [currentProfile] : []}
                      activeSite={ceoActiveSite}
                      onSelectSite={(selected) => {
                        setCeoAppId(selected.id)
                        setProfileWebsitePreview(false)
                      }}
                      onViewWebsite={() => {
                        setFabLaunchProject(null)
                        setProfileWebsitePreview(true)
                      }}
                      onOpenProject={(project) => {
                        setFabLaunchProject(project)
                        setProfileWebsitePreview(true)
                      }}
                    />
                  )}
                  <input ref={drawingInputRef} type="file" accept="image/*" hidden onChange={handleDrawingFile} />
                </div>
              )}
            </section>
          )}

          {tab === 'settings' && settingsView === 'home' && (
            <section className="panel-box settings-page">
              <h3>Settings</h3>
              <div className="logged-as">
                <p>Logged in as</p>
                {signedInAccount ? (
                  <strong>{signedInAccount.email}</strong>
                ) : (
                  <strong>Not signed in</strong>
                )}
              </div>
              {switchAccounts.length > 1 && (
                <div className="account-switch">
                  <p className="shop-copy">Switch accounts</p>
                  {switchAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      className={account.id === signedInId ? 'account-chip active' : 'account-chip'}
                      onClick={() => switchAccount(account.id)}
                    >
                      <span>{account.email}</span>
                      <small>{account.id === signedInId ? 'Current' : 'Switch'}</small>
                    </button>
                  ))}
                </div>
              )}
              <p className="shop-copy">Manage the account that runs your Fortress website.</p>
              {signedInAccount ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setAuthError('')
                    setAuthForm({ email: '', password: '' })
                    goSettingsView('add')
                  }}
                >
                  Add another account
                </button>
              ) : null}
              {signedInAccount ? (
                <button type="button" className="primary-button" onClick={() => goSettingsView('apps')}>
                  Manage Applications
                </button>
              ) : null}
              <button type="button" className="buy-website-btn" onClick={() => openBuyWebsite()}>
                Buy CEO Website
              </button>
              <button type="button" className="primary-button" onClick={() => goSettingsView('manage')}>
                Manage accounts
              </button>
            </section>
          )}

          {tab === 'settings' && settingsView === 'manage' && (
            <section className="panel-box settings-page">
              <button type="button" className="text-back" onClick={() => goSettingsView('home')}>
                Back
              </button>
              <h3>Manage accounts</h3>
              <div className="settings-actions">
                <button type="button" onClick={() => goSettingsView('my-account')}>
                  My account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('')
                    setAuthForm({ email: '', password: '' })
                    goSettingsView('create')
                  }}
                >
                  Create account
                </button>
                <button type="button" onClick={() => goSettingsView('delete')}>
                  Delete account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('')
                    setAuthForm({ email: '', password: '' })
                    goSettingsView('add')
                  }}
                >
                  Add account
                </button>
              </div>
            </section>
          )}

          {tab === 'settings' && settingsView === 'my-account' && (
            <section className="panel-box settings-page">
              <button type="button" className="text-back" onClick={() => goSettingsView('manage')}>
                Back
              </button>
              <h3>My account</h3>
              {signedInAccount ? (
                <div className="settings-card">
                  <p>{signedInAccount.email}</p>
                  {signedInAccount.websites.some((site) => site.link) ? (
                    <div className="website-links">
                      {signedInAccount.websites
                        .filter((site) => site.link)
                        .map((site) => (
                          <a className="website-link" key={site.id} href={site.link}>
                            <strong>{site.name}</strong>
                            <span>{site.link}</span>
                          </a>
                        ))}
                    </div>
                  ) : (
                    <p className="empty-note">No website on this account yet.</p>
                  )}
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => openBuyWebsite()}
                  >
                    Buy CEO Website
                  </button>
                  <button type="button" className="primary-button" onClick={() => goTab('profile')}>
                    Open profile
                  </button>
                  <button type="button" className="text-back" onClick={logout}>
                    Logout
                  </button>
                </div>
              ) : (
                <p className="empty-note">No account is signed in. Create an account or add an account.</p>
              )}
            </section>
          )}

          {tab === 'settings' && settingsView === 'create' && (
            <section className="panel-box settings-page">
              <button
                type="button"
                className="text-back"
                onClick={() => {
                  if (shopFlowRef.current || cardBuyRef.current) {
                    skipShopChoiceRef.current = false
                    goSettingsView(signedInAccount ? 'shop-account' : 'manage')
                    return
                  }
                  if (!signedInAccount) {
                    goLogin()
                    return
                  }
                  goSettingsView('manage')
                }}
              >
                Back
              </button>
              <form className="create-account-form" onSubmit={handleCreateAccount}>
                <h3>Create account</h3>
                <p className="shop-copy">Enter your login credentials.</p>
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((value) => ({ ...value, email: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((value) => ({ ...value, password: event.target.value }))}
                  required
                />
                {authError && <p className="form-error">{authError}</p>}
                <button type="submit" className="primary-button">
                  Create account
                </button>
              </form>
            </section>
          )}

          {tab === 'settings' && settingsView === 'add' && (
            <section className="panel-box settings-page">
              <button type="button" className="text-back" onClick={() => goSettingsView('manage')}>
                Back
              </button>
              <form className="create-account-form" onSubmit={handleAddAccount}>
                <h3>Add another account</h3>
                <p className="shop-copy">
                  Enter an email and password. A new account is created and saved. You stay on this account and can switch to it from Settings.
                </p>
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((value) => ({ ...value, email: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((value) => ({ ...value, password: event.target.value }))}
                  required
                />
                {authError && <p className="form-error">{authError}</p>}
                <button type="submit" className="primary-button">
                  Create account
                </button>
              </form>
            </section>
          )}

          {tab === 'settings' && settingsView === 'apps' && (
            <section className="panel-box settings-page">
              <button
                type="button"
                className="text-back"
                onClick={() => {
                  cancelDeleteApplication()
                  goSettingsView('home')
                }}
              >
                Back
              </button>
              <h3>Manage Applications</h3>
              <p className="shop-copy">Apps saved on {signedInAccount?.email || 'this account'}.</p>
              {signedInAccount?.websites?.length ? (
                <div className="app-manage-list">
                  {signedInAccount.websites.map((site) => {
                    const label = `${visibleSiteLabel(site)} - ${site.name || 'App'}`
                    const confirming = deleteAppId === site.id
                    return (
                      <div key={site.id} className="app-manage-item">
                        <div className="app-manage-row">
                          <div>
                            <strong>{visibleSiteLabel(site)}</strong>
                            <span>
                              {' '}
                              - {site.name || 'App'}
                            </span>
                          </div>
                          {!confirming && (
                            <button type="button" className="danger-button" onClick={() => requestDeleteApplication(site.id)}>
                              Delete app
                            </button>
                          )}
                        </div>
                        {confirming && (
                          <form className="create-account-form app-delete-confirm" onSubmit={confirmDeleteApplication}>
                            <h3>Confirm delete</h3>
                            <p className="shop-copy">
                              Are you sure you want to delete {label}? Enter the email and password for{' '}
                              {signedInAccount.email} to confirm.
                            </p>
                            <input
                              type="email"
                              placeholder="Account email"
                              autoComplete="username"
                              value={deleteAppForm.email}
                              onChange={(event) => setDeleteAppForm((value) => ({ ...value, email: event.target.value }))}
                              required
                            />
                            <input
                              type="password"
                              placeholder="Account password"
                              autoComplete="current-password"
                              value={deleteAppForm.password}
                              onChange={(event) => setDeleteAppForm((value) => ({ ...value, password: event.target.value }))}
                              required
                            />
                            {deleteAppError && <p className="form-error">{deleteAppError}</p>}
                            <button type="submit" className="danger-button">
                              Delete app
                            </button>
                            <button type="button" className="text-back" onClick={cancelDeleteApplication}>
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="empty-note">No apps on this account yet.</p>
              )}
            </section>
          )}

          {tab === 'settings' && settingsView === 'delete' && (
            <section className="panel-box settings-page">
              <button type="button" className="text-back" onClick={() => goSettingsView('manage')}>
                Back
              </button>
              <h3>Delete account</h3>
              {signedInAccount ? (
                <div className="settings-card">
                  <p>Delete {signedInAccount.email} and the websites on this account?</p>
                  <button type="button" className="danger-button" onClick={deleteSignedInAccount}>
                    Delete account
                  </button>
                </div>
              ) : (
                <p className="empty-note">Sign in from My account or Add account before deleting an account.</p>
              )}
            </section>
          )}

          {tab === 'settings' && settingsView === 'loading' && (
            <section className="panel-box settings-page">
              <p className="loading-note">{busyLabel}</p>
            </section>
          )}

          {tab === 'settings' && settingsView === 'buy' && (
            <section className="panel-box settings-page">
              <h3>Buy CEO Website</h3>
              <p className="shop-copy">
                Choose construction (Rodcroft template), manufacturing (Prixburg template), or the fabrication website (Zantac template).
                Swipe the pictures to see how that website solves problems at that kind of company.
              </p>
              <div className="settings-actions">
                {SYSTEM_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={systemType === type.id ? 'system-choice active' : 'system-choice'}
                    onClick={() => continueFromSystem(type.id)}
                  >
                    {type.label}
                    <small>{type.style}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === 'settings' && settingsView === 'system' && (
            <section className="panel-box settings-page">
              <button
                type="button"
                className="text-back"
                onClick={() => goSettingsView(pendingSignup ? 'buy' : 'home')}
              >
                Back
              </button>
              <h3>Buy a website</h3>
              <p className="shop-copy">
                Choose a type, then swipe the pictures. Each picture explains how that website solves problems at that kind of company.
              </p>
              <div className="settings-actions">
                {SYSTEM_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={systemType === type.id ? 'system-choice active' : 'system-choice'}
                    onClick={() => continueFromSystem(type.id)}
                  >
                    {type.label}
                    <small>{type.style}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === 'settings' && settingsView === 'shop-account' && (
            <section className="panel-box settings-page">
              <button
                type="button"
                className="text-back"
                onClick={() => {
                  if (cardBuyRef.current) {
                    goSettingsView('home')
                    return
                  }
                  goSettingsView('system')
                }}
              >
                Back
              </button>
              <h3>{chosenSystem ? `Buy ${chosenSystem.label} system` : 'Buy system'}</h3>
              <p className="shop-copy">
                Use the account you are signed in with, or create a new account to buy this system.
              </p>
              <div className="settings-actions">
                <button type="button" onClick={() => chooseShopAccount('current')}>
                  Use current running account
                </button>
                <button type="button" onClick={() => chooseShopAccount('new')}>
                  Create a new account
                </button>
              </div>
            </section>
          )}

          {tab === 'settings' && settingsView === 'preview' && chosenSystem && (
            <section className="panel-box settings-page">
              <button type="button" className="text-back" onClick={() => goSettingsView('system')}>
                Back
              </button>
              <h3>{chosenSystem.label}</h3>
              <p className="eyebrow">{chosenSystem.style}</p>
              <SystemExplainCards system={chosenSystem} />
              {chosenSystem.id === 'fabrication' && (
                <div className="settings-actions">
                  {FAB_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={fabPlan === plan.id ? 'system-choice active' : 'system-choice'}
                      onClick={() => setFabPlan(plan.id)}
                    >
                      {plan.label}
                      <small>{formatPrice(plan.price)}</small>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="primary-button" onClick={continuePreview}>
                Continue to EcoCash
              </button>
              <button type="button" className="trial-button" onClick={startFreeTrial}>
                Start 14 day free trial
              </button>
            </section>
          )}

          {tab === 'settings' && settingsView === 'ecocash' && (
            <section className="panel-box settings-page">
              <button
                type="button"
                className="text-back"
                onClick={() => {
                  setEcocash({ number: '', password: '', name: '' })
                  setPaymentNote('')
                  if (pendingSignup) {
                    goSettingsView('buy')
                    setOverlay({ type: 'buy-system' })
                    return
                  }
                  if (
                    (shopFlowRef.current || cardBuyRef.current) &&
                    skipShopChoiceRef.current &&
                    signedInAccount
                  ) {
                    skipShopChoiceRef.current = false
                    goSettingsView('shop-account')
                    return
                  }
                  if (cardBuyRef.current) {
                    goSettingsView(signedInAccount ? 'shop-account' : 'create')
                    return
                  }
                  goSettingsView('system')
                }}
              >
                Back
              </button>
              <form className={`ecocash-card${!PHASE1_COMPLETE ? ' is-sealed' : ''}`} onSubmit={approvePayment}>
                {!PHASE1_COMPLETE ? (
                  <PhaseSeal kicker="Waterproof lock" title="Phase 2 is locked" message={PHASE1_ECOCASH_NOTE} />
                ) : null}
                <p className="ecocash-kicker">EcoCash</p>
                <h3>{chosenSystem ? chosenSystem.label : 'Fortress system'}</h3>
                {systemType === 'fabrication' ? (
                  <p className="shop-copy">
                    {formatPrice((FAB_PLANS.find((plan) => plan.id === fabPlan) || FAB_PLANS[0]).price)} ·{' '}
                    {(FAB_PLANS.find((plan) => plan.id === fabPlan) || FAB_PLANS[0]).label}
                  </p>
                ) : null}
                <label>
                  EcoCash number
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="07xxxxxxxx"
                    value={ecocash.number}
                    disabled={!PHASE1_COMPLETE}
                    onChange={(event) => setEcocash((value) => ({ ...value, number: event.target.value }))}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Password"
                    value={ecocash.password}
                    disabled={!PHASE1_COMPLETE}
                    onChange={(event) => setEcocash((value) => ({ ...value, password: event.target.value }))}
                  />
                </label>
                <label>
                  Name on EcoCash
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Name on EcoCash"
                    value={ecocash.name}
                    disabled={!PHASE1_COMPLETE}
                    onChange={(event) => setEcocash((value) => ({ ...value, name: event.target.value }))}
                  />
                </label>
                {paymentNote && <p className="form-error">{paymentNote}</p>}
                <button type="submit" className="primary-button" disabled={!PHASE1_COMPLETE}>
                  {purchaseMode === 'reactivate' ? 'Subscribe to reactivate' : 'Buy with EcoCash'}
                </button>
              </form>
            </section>
          )}

          {tab === 'settings' && settingsView === 'tailor' && (
            <section className="panel-box settings-page">
              {purchaseMode !== 'trial' ? <p className="payment-approved">Payment approved</p> : null}
              <form className="create-account-form" onSubmit={createGeneratedWebsite}>
                <h3>{purchaseMode === 'trial' ? 'Free trial tailor making details' : 'Tailor making details'}</h3>
                <p className="shop-copy">
                  {purchaseMode === 'trial'
                    ? 'Write a domain. Fortress creates a free temporary subdomain for 14 days. You can edit it. The app works fully, and it shows next to your profile grid.'
                    : systemType === 'manufacturing'
                    ? 'Creates an exact Prixburg manufacturing website (with empty data) as a tenant subdomain of Fortress.'
                    : systemType === 'construction'
                      ? 'Creates an exact Rodcroft construction website (with empty data) as a tenant subdomain of Fortress.'
                      : 'Configure your calculator details.'}
                </p>
                <label>
                  {systemType === 'fabrication' ? 'Name of fabrication website' : 'Name of website'}
                  <input
                    type="text"
                    placeholder="Name of the website"
                    value={websiteName}
                    onChange={(event) => setWebsiteName(event.target.value)}
                    required
                  />
                </label>
                {purchaseMode === 'trial' && (
                  <label>
                    Domain
                    <input
                      type="text"
                      placeholder="your-company"
                      value={domainEdited ? websiteDomain : slugify(websiteName || 'company')}
                      onChange={(event) => {
                        setDomainEdited(true)
                        setWebsiteDomain(event.target.value)
                      }}
                    />
                  </label>
                )}
                {(purchaseMode === 'trial' || systemType !== 'fabrication') && (
                  <label>
                    {purchaseMode === 'trial' ? 'Temporary subdomain (edit the domain above)' : 'Tenant Subdomain (under Fortress)'}
                    <input
                      type="text"
                      value={visibleSiteLabel(
                        purchaseMode === 'trial'
                          ? domainEdited
                            ? websiteDomain || websiteName || 'company'
                            : websiteName || 'company'
                          : websiteName || 'company',
                      )}
                      readOnly
                    />
                  </label>
                )}
                {systemType !== 'fabrication' && (
                  <>
                    <label>
                      CEO Name (optional)
                      <input
                        type="text"
                        placeholder="CEO name"
                        value={websiteCeo}
                        onChange={(event) => setWebsiteCeo(event.target.value)}
                      />
                    </label>
                  </>
                )}
                <button type="submit" className="primary-button">
                  {purchaseMode === 'trial'
                    ? 'Start 14 day free trial'
                    : systemType === 'fabrication'
                      ? 'Open calculator'
                      : 'Create website'}
                </button>
              </form>
            </section>
          )}
        </main>

        {overlay?.type === 'gallery' && overlayCompany && (
          <OpenedCard
            company={overlayCompany}
            startIndex={overlay.postIndex || 0}
            onClose={closeOverlay}
            onViewProfile={() => viewCompanyProfile(overlayCompany)}
            comments={comments}
            onAddComment={addComment}
            onReplyComment={replyToComment}
            viewer={signedInAccount}
            onNeedAccount={needAccountForComment}
          />
        )}

        {overlay?.type === 'profile' && overlayCompany && (
          <PublicCompanyProfile
            company={overlayCompany}
            comments={comments}
            onClose={closeOverlay}
            onOpenPost={(index) => openCompanyPost(overlayCompany, index)}
            onOpenPhoto={() => openCompanyPost(overlayCompany, 'avatar')}
            viewer={signedInAccount}
            onAddComment={addComment}
            onReplyComment={replyToComment}
            onNeedAccount={needAccountForComment}
          />
        )}

        {overlay?.type === 'profile' && overlayCompany && overlay.postIndex != null && overlay.postIndex !== 'avatar' && (
          <OpenedCard
            company={overlayCompany}
            startIndex={overlay.postIndex}
            onClose={closeCompanyPost}
            comments={comments}
            onAddComment={addComment}
            onReplyComment={replyToComment}
            viewer={signedInAccount}
            onNeedAccount={needAccountForComment}
          />
        )}

        {overlay?.type === 'profile' && overlayCompany && overlay.postIndex === 'avatar' && (
          <OpenedCard
            company={{
              ...overlayCompany,
              slides: [
                {
                  photo: overlayCompany.profilePhoto || firstSlide(overlayCompany)?.photo,
                  testimonial: '',
                },
              ],
            }}
            onClose={closeCompanyPost}
            comments={comments}
            onAddComment={addComment}
            onReplyComment={replyToComment}
            viewer={signedInAccount}
            onNeedAccount={needAccountForComment}
          />
        )}

        {overlay?.type === 'own-photo' && (overlay.company || currentProfile) && (
          <OpenedCard
            company={
              overlay.company || {
                id: currentProfile.id,
                name: currentProfile.name || 'My account',
                slides: [
                  {
                    photo: currentProfile.profilePhoto || currentProfile.gallery?.[0],
                    testimonial: '',
                  },
                ],
              }
            }
            startIndex={0}
            onClose={closeOverlay}
            comments={comments}
            onAddComment={addComment}
            onReplyComment={replyToComment}
            viewer={signedInAccount}
            onNeedAccount={needAccountForComment}
          />
        )}

        {overlay?.type === 'own-post' && ownPostCompany(overlay.postIndex || 0) && (
          <OpenedCard
            company={ownPostCompany(overlay.postIndex || 0)}
            startIndex={0}
            onClose={closeOverlay}
            comments={comments}
            onAddComment={addComment}
            onReplyComment={replyToComment}
            viewer={signedInAccount}
            onNeedAccount={needAccountForComment}
            canDelete
            onDelete={() => deleteOwnPhoto(overlay.postIndex || 0)}
            canEditCaption
            onCaptionChange={(_, caption) => updateOwnSlideCaption(overlay.postIndex || 0, caption)}
            commentIndex={overlay.postIndex || 0}
          />
        )}

        {overlay?.type === 'buy-system' && (
          <section
            className="detail-sheet gate-sheet"
            aria-label="Buy a Fortress system"
            onClick={(event) => {
              if (event.target === event.currentTarget && pendingSignup) cancelPendingSignup()
            }}
          >
            <button
              type="button"
              className="detail-close"
              onClick={() => (pendingSignup ? cancelPendingSignup() : closeOverlay())}
            >
              Close
            </button>
            <div className="lock-card buy-system-card">
              <h2>Buy CEO Website</h2>
              <p className="shop-copy">
                Construction (Rodcroft template), manufacturing (Prixburg template), or the fabrication website (Zantac template).
              </p>
              <div className="settings-actions">
                {SYSTEM_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={systemType === type.id ? 'system-choice active' : 'system-choice'}
                    onClick={() => continueFromSystem(type.id)}
                  >
                    {type.label}
                    <small>{type.style}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {overlay?.type === 'live-link' && (overlay.site || currentProfile) && (
          <section className="detail-sheet gate-sheet" aria-label="Generated website link">
            <button
              type="button"
              className="detail-close"
              onClick={() => {
                setOverlay(null)
                pushPath('/profile')
              }}
            >
              Close
            </button>
            <div className="lock-card live-link-card">
              <h2>Your system is live</h2>
              <p className="shop-copy">Fortress generated this website from the tailor-made name.</p>
              <p className="live-link-url">{visibleSiteLabel(overlay.site || currentProfile)}</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const site = overlay.site || currentProfile
                  const slug = cleanSlug(site?.slug || site?.catalogId || site?.name || '')
                  if (slug && slug !== 'rodcroft' && slug !== 'prixburg') {
                    window.location.assign(`/site/${slug}`)
                    return
                  }
                  openPrivateSystem(site)
                }}
              >
                Open
              </button>
            </div>
          </section>
        )}

        {overlay?.type === 'gate' && (
          <section className="detail-sheet gate-sheet" aria-label="Create an account">
            <button type="button" className="detail-close" onClick={closeOverlay}>
              Close
            </button>
            <div className="lock-card">
              <IconLock />
              <h2>Login to open profiles</h2>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  fromHomeCardRef.current = true
                  goLogin()
                }}
              >
                Login
              </button>
              <button
                type="button"
                className="text-back"
                onClick={() => {
                  fromHomeCardRef.current = true
                  openSettingsPage('create')
                }}
              >
                Create account
              </button>
            </div>
          </section>
        )}

        {overlay?.type === 'add-media' && (
          <section className="detail-sheet add-media-sheet" aria-label="Add media">
            <button type="button" className="detail-close" onClick={closeOverlay}>
              Close
            </button>
            <div className="add-media-card">
              <h2>Add media</h2>
              <button type="button" className="add-media-option has-exclusive" onClick={startBestSellingPost}>
                <span className="exclusive-sticker">exclusive</span>
                <strong>Best selling post</strong>
                <span>Appears on Best selling, your gallery grid, and your company card after the exclusive plan.</span>
              </button>
              <button type="button" className="add-media-option" onClick={startGeneralPost}>
                <strong>General post</strong>
                <span>Appears on your company card and gallery grid.</span>
              </button>
            </div>
          </section>
        )}

        {overlay?.type === 'best-selling-plans' && (
          <section className="detail-sheet add-media-sheet" aria-label="Exclusive best selling plans">
            <button type="button" className="detail-close" onClick={closeOverlay}>
              Close
            </button>
            <div className="add-media-card best-selling-plans-card">
              <p className="ecocash-kicker">Exclusive</p>
              <h2>Best selling</h2>
              <p className="shop-copy">Choose a plan for exclusive Best selling placement.</p>
              <div className="fee-picker best-selling-fee-picker">
                {BEST_SELLING_PLANS.map((plan) => (
                  <label
                    key={plan.id}
                    className={compose.feePlan === plan.id ? 'class-option active' : 'class-option'}
                  >
                    <input
                      type="radio"
                      name="best-selling-fee"
                      value={plan.id}
                      checked={compose.feePlan === plan.id}
                      onChange={() => setCompose((previous) => ({ ...previous, feePlan: plan.id }))}
                    />
                    <span>
                      <strong>{plan.label}</strong>
                      {plan.note ? <small>{plan.note}</small> : null}
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={!compose.feePlan}
                onClick={continueBestSellingPlan}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {overlay?.type === 'feature-ecocash' && (
          <section className="detail-sheet add-media-sheet" aria-label="Best selling EcoCash">
            <button
              type="button"
              className="detail-close"
              onClick={closeOverlay}
            >
              Close
            </button>
            <form className={`add-media-card ecocash-card${!PHASE1_COMPLETE ? ' is-sealed' : ''}`} onSubmit={submitFeatureEcoCash}>
              {!PHASE1_COMPLETE ? (
                <PhaseSeal kicker="Waterproof lock" title="Phase 2 is locked" message={PHASE1_ECOCASH_NOTE} />
              ) : null}
              <p className="ecocash-kicker">EcoCash</p>
              <h2>Best selling exclusive</h2>
              <p className="shop-copy">
                {bestSellingPlanLabel(compose.feePlan) || '$1 a week on exclusive trending'} for the Best selling card.
              </p>
              <label>
                EcoCash number
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="07xxxxxxxx"
                  value={ecocash.number}
                  disabled={!PHASE1_COMPLETE}
                  onChange={(event) => setEcocash((value) => ({ ...value, number: event.target.value }))}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Password"
                  value={ecocash.password}
                  disabled={!PHASE1_COMPLETE}
                  onChange={(event) => setEcocash((value) => ({ ...value, password: event.target.value }))}
                />
              </label>
              <label>
                Name on EcoCash
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Name on EcoCash"
                  value={ecocash.name}
                  disabled={!PHASE1_COMPLETE}
                  onChange={(event) => setEcocash((value) => ({ ...value, name: event.target.value }))}
                />
              </label>
              {paymentNote && <p className="form-error">{paymentNote}</p>}
              <button type="submit" className="primary-button" disabled={!PHASE1_COMPLETE}>
                Approve payment
              </button>
            </form>
          </section>
        )}

        {overlay?.type === 'feature-loading' && (
          <section className="detail-sheet add-media-sheet" aria-label="Approving payment">
            <div className="add-media-card">
              <p className="loading-note">{busyLabel || 'Approving payment…'}</p>
            </div>
          </section>
        )}

        {overlay?.type === 'compose' && (
          <section className="detail-sheet add-media-sheet" aria-label="Add caption">
            <button type="button" className="detail-close" onClick={closeOverlay}>
              Close
            </button>
            <form className="add-media-card" onSubmit={submitCompose}>
              <h2>{compose.mode === 'feature' ? 'Best selling post' : 'General post'}</h2>
              {compose.mode === 'feature' && compose.feePlan ? (
                <p className="shop-copy">{bestSellingPlanLabel(compose.feePlan)}</p>
              ) : null}
              {compose.video ? (
                <video className="compose-preview" src={compose.video} controls playsInline />
              ) : compose.photo ? (
                <img className="compose-preview" src={compose.photo} alt="" />
              ) : null}
              {compose.note ? <p className="form-error">{compose.note}</p> : null}
              <label>
                Testimonial caption
                <textarea
                  rows="3"
                  value={compose.caption}
                  placeholder="Write a testimonial caption, or leave blank"
                  onChange={(event) =>
                    setCompose((previous) => ({ ...previous, caption: event.target.value }))
                  }
                />
              </label>
              <button
                type="submit"
                className="primary-button"
                disabled={
                  (!compose.photo && !compose.video) ||
                  (compose.mode === 'feature' && !compose.feePlan)
                }
              >
                {compose.mode === 'feature' ? 'Pay with EcoCash' : 'Post'}
              </button>
            </form>
          </section>
        )}

        {tab === 'profile' && signedInAccount && (
          <>
            <input
              ref={composeInputRef}
              type="file"
              accept="image/*,video/*,.mp4,.mov,.webm,.m4v"
              className="file-input-hidden"
              onChange={handleComposeFile}
            />
            <button
              type="button"
              className="profile-fab"
              aria-label="Add media"
              onClick={() => openAddMedia()}
            >
              +
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default App
