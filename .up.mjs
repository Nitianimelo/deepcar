import { readFileSync } from 'node:fs'
import { chamarGoogle, tokenGoogle, ESCOPO_PLAY } from './api/_lib/google.js'
const PKG = 'deepcar.app.android'
const B = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`
const edit = await chamarGoogle(`${B}/edits`, ESCOPO_PLAY, { metodo: 'POST', corpo: {} })
if (!edit.ok) throw new Error('edit: ' + JSON.stringify(edit.dados))
const id = edit.dados.id
console.log('edição', id)
const aab = readFileSync(process.argv[2])
const up = await fetch(`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}/edits/${id}/bundles?uploadType=media`, {
  method: 'POST', headers: { Authorization: `Bearer ${await tokenGoogle(ESCOPO_PLAY)}`, 'Content-Type': 'application/octet-stream' }, body: aab, signal: AbortSignal.timeout(300000) })
const upj = await up.json(); console.log('upload', up.status, JSON.stringify(upj).slice(0, 200))
if (!up.ok) throw new Error('upload falhou')
const tr = await chamarGoogle(`${B}/edits/${id}/tracks/internal`, ESCOPO_PLAY, { metodo: 'PUT', corpo: { track: 'internal', releases: [{ name: '4 (1.3.0)', versionCodes: [String(upj.versionCode)], status: 'completed',
  releaseNotes: [{ language: 'pt-PT', text: 'Assinatura dos planos dentro do app, notificações, ajustes no teste grátis e mensagens de erro com contato do suporte.' }] }] } })
console.log('faixa', tr.status, JSON.stringify(tr.dados).slice(0, 300))
const c = await chamarGoogle(`${B}/edits/${id}:commit`, ESCOPO_PLAY, { metodo: 'POST', corpo: {} })
console.log('commit', c.status, JSON.stringify(c.dados).slice(0, 400))
