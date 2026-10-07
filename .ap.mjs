import { chamarGoogle, ESCOPO_PLAY } from './api/_lib/google.js'
const r = await chamarGoogle('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/deepcar.app.android/subscriptions', ESCOPO_PLAY)
console.log('HTTP', r.status, JSON.stringify(r.dados).slice(0, 250))
