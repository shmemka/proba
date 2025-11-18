type ResourceItem = {
  title: string
  description: string
  type: string
  readingTime: string
}

const resources: ResourceItem[] = [
  {
    title: 'Что такое проба?',
    description:
      'Разбираем, чем Проба отличается от стажировок и пет-проектов, как устроена платформа и почему формат «проб» помогает накапливать опыт без лишнего риска.',
    type: 'Статья',
    readingTime: '5 минут',
  },
]

export default function ResourcesPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <header className="mb-8 sm:mb-12">
        <p className="text-xs uppercase tracking-[0.2em] text-primary-500 mb-3">Подборка материалов</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">
          Ресурсы
        </h1>
        <p className="text-base sm:text-lg font-light text-primary-600 max-w-3xl">
          Полезные материалы и статьи о сервисе, поиске проб, навигации по платформе и первых шагах в реальных задачах.
        </p>
      </header>

      <section className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map(resource => (
          <article
            key={resource.title}
            className="flex flex-col gap-3 p-5 sm:p-6 border border-primary-100 rounded-apple bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 text-xs text-primary-500 uppercase tracking-[0.12em]">
              <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">{resource.type}</span>
              <span className="text-primary-400">{resource.readingTime}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-normal text-primary-900 tracking-tight">{resource.title}</h2>
            <p className="text-sm sm:text-base font-light text-primary-600 leading-relaxed flex-1">{resource.description}</p>
            <span className="text-sm font-normal text-primary-700 inline-flex items-center gap-2">
              Читать подробнее
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 stroke-current"
                strokeWidth="1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
              </svg>
            </span>
          </article>
        ))}
      </section>
    </main>
  )
}
