'use server'

export async function verifyInviteCode(code: string): Promise<boolean> {
  const serverCode = process.env.REGISTRATION_INVITE_CODE
  if (!serverCode) return true // No code configured = allow registration
  return code === serverCode
}
