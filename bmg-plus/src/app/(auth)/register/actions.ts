'use server'

export async function verifyInviteCode(code: string): Promise<{ valid: boolean; required: boolean }> {
  const serverCode = process.env.REGISTRATION_INVITE_CODE
  if (!serverCode) return { valid: true, required: false }
  if (!code || code.trim() === '') return { valid: false, required: true }
  return { valid: code === serverCode, required: true }
}
