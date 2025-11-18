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

  const { data: uploadData, error } = await supabase.storage.from(bucket).upload(path, normalizedFile, {
    upsert,
    cacheControl,
    contentType: normalizedFile.type || 'application/octet-stream',
  })

  if (error) {
    // Проверяем, что это ошибка отсутствия bucket
    if (error.message?.toLowerCase().includes('bucket not found') || 
        error.message?.toLowerCase().includes('bucket') && error.message?.toLowerCase().includes('not found')) {
      throw new Error(
        `Bucket "${bucket}" не найден в Supabase Storage. ` +
        `Создайте bucket "${bucket}" в Supabase: Storage → Buckets → New bucket. ` +
        `Подробная инструкция: SUPABASE_STORAGE_SETUP.md`
      )
    }
    
    // Другие ошибки
    if (error.message) {
      throw new Error(`Ошибка загрузки в Storage: ${error.message}`)
    }
    throw error
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  if (!data?.publicUrl) {
    throw new Error(`Не удалось получить публичный URL для загруженного файла`)
  }

  return {
    publicUrl: data.publicUrl,
    bucket,
    path,
  }
}

