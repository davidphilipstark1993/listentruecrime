import { describe, expect, it, vi } from 'vitest'
import { cacheArtwork } from './storage'

function fakeAdmin() {
  const upload = vi.fn(async () => ({ error: null }))
  const admin = {
    storage: { from: () => ({ upload, getPublicUrl: () => ({ data: { publicUrl: 'https://x.supabase.co/p1.jpg' } }) }) },
  }
  return { admin: admin as never, upload }
}

describe('cacheArtwork', () => {
  it('uploads with the detected format, not the remote server header', async () => {
    const { admin, upload } = fakeAdmin()
    await cacheArtwork(admin, 'p1', Buffer.from('x'), 'jpeg', 'image/jpg')
    expect(upload).toHaveBeenCalledWith('p1.jpg', expect.anything(), expect.objectContaining({ contentType: 'image/jpeg' }))
  })

  it('maps png and webp to their standard types', async () => {
    const { admin, upload } = fakeAdmin()
    await cacheArtwork(admin, 'p2', Buffer.from('x'), 'png', null)
    await cacheArtwork(admin, 'p3', Buffer.from('x'), 'webp', 'application/octet-stream')
    expect(upload).toHaveBeenNthCalledWith(1, 'p2.png', expect.anything(), expect.objectContaining({ contentType: 'image/png' }))
    expect(upload).toHaveBeenNthCalledWith(2, 'p3.webp', expect.anything(), expect.objectContaining({ contentType: 'image/webp' }))
  })
})
