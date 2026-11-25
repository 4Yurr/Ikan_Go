import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const hasImageStorage = Boolean(supabase)

export async function uploadFishImage(file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi untuk unggah foto.')
  }

  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
  const path = `products/${crypto.randomUUID()}.${extension}`
  const { data, error } = await supabase.storage
    .from('fish-images')
    .upload(path, file, { cacheControl: '3600', contentType: file.type })

  if (error) {
    throw new Error(`Foto gagal diunggah: ${error.message}`)
  }

  return supabase.storage.from('fish-images').getPublicUrl(data.path).data.publicUrl
}

export function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Foto tidak dapat dibaca.'))
    }
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
    reader.readAsDataURL(file)
  })
}
