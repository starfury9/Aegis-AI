const trim = (value: string | undefined) => (value ?? '').trim()

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

/** Marketing / deployment URLs and on-chain placeholders. Override via `.env` (VITE_*). */
export function getPublicLinks() {
  const env = import.meta.env
  const liveApp = trim(env.VITE_LIVE_APP_URL) || 'https://YOUR-AEGIS-APP.vercel.app'
  const base = liveApp.replace(/\/$/, '')
  const landingPage = trim(env.VITE_LANDING_URL) || 'https://YOUR-AEGIS-LANDING.vercel.app'
  const agentDashboard = trim(env.VITE_AGENT_DASHBOARD_URL) || `${base}/dashboard`
  const donationPage = trim(env.VITE_DONATION_URL) || `${base}/donate`
  const tokenContract = trim(env.VITE_TOKEN_CONTRACT) || ZERO_ADDR
  const agentContract = trim(env.VITE_AGENT_CONTRACT) || ZERO_ADDR
  const treasuryAddress = trim(env.VITE_TREASURY_ADDRESS) || ZERO_ADDR

  return {
    liveApp: base,
    landingPage,
    agentDashboard,
    donationPage,
    tokenContract,
    agentContract,
    treasuryAddress,
  }
}

/** Same shape as companion projects: paste into Discord / docs after you deploy & verify contracts. */
export function formatLiveLinksBulletList(): string {
  const L = getPublicLinks()
  return [
    '🔗 Live Links',
    '',
    `a. 🌐 Live App: ${L.liveApp}`,
    `b. 🤖 Agent Dashboard: ${L.agentDashboard}`,
    `c. 🌐 Landing Page: ${L.landingPage}`,
    `d. 💜 $AEGIS Token: ${L.tokenContract}`,
    `e. 🌐 Donation Page: ${L.donationPage}`,
    `f. 📜 Agent Contract: ${L.agentContract}`,
  ].join('\n')
}

export function isPlaceholderAddress(addr: string) {
  return !addr || addr === ZERO_ADDR
}
