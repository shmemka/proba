'use client'

import Image from 'next/image'
import Link from 'next/link'

interface ArticleCardProps {
  id: string
  title: string
  excerpt: string
  imageUrl: string
}

export default function ArticleCard({ id, title, excerpt, imageUrl }: ArticleCardProps) {
  return (
    <Link
      href={`/resources/articles/${id}`}
      className="block group bg-white rounded-apple border border-primary-100 overflow-hidden hover:border-primary-300 transition-colors duration-200"
    >
      {/* Изображение 16:9 */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-primary-50 flex items-center justify-center">
            <span className="text-primary-400 font-light">Нет изображения</span>
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-4 sm:p-6">
        <h3 className="text-xl sm:text-2xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight group-hover:text-primary-700 transition-colors duration-200 line-clamp-2">
          {title}
        </h3>
        <p className="text-sm sm:text-base text-primary-600 font-light leading-relaxed line-clamp-2">
          {excerpt}
        </p>
      </div>
    </Link>
  )
}

