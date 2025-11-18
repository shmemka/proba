import { getSupabaseClient } from './supabaseClient'

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'public-assets'

type UploadPublicAssetParams = {
  file: File | Blob
  path: string
  bucket?: string
  cacheControl?: `${number}`
  upsert?: boolean
}

export type UploadPublicAssetResult = {
  publicUrl: string
  bucket: string
  path: string
}

export function getStorageBucketName() {
  return DEFAULT_BUCKET
}

export async function uploadPublicAsset({
  file,
  path,
  bucket = DEFAULT_BUCKET,
  cacheControl = '3600',
  upsert = true,
}: UploadPublicAssetParams): Promise<UploadPublicAssetResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const normalizedFile =
    file instanceof File
      ? file
      : new File([file], path.split('/').pop() || 'file', {
          type: file.type || 'application/octet-stream',
        })

  const { error } = await supabase.storage.from(bucket).upload(path, normalizedFile, {
    upsert,
    cacheControl,
    contentType: normalizedFile.type || 'application/octet-stream',
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    publicUrl: data.publicUrl,
    bucket,
    path,
  }
}

