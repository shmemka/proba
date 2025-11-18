const resources = [
  {
    title: 'Что такое проба?',
    description:
      'Кратко о том, чем является Проба, зачем нужен сервис и как он помогает студентам развиваться через реальные задачи.',
  },
]

export default function ResourcesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">
          Ресурсы
        </h1>
        <p className="text-base sm:text-lg font-light text-primary-600">
          Полезные материалы и статьи, которые помогают разобраться в сервисе и находить новые возможности.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <article
            key={resource.title}
            className="p-5 sm:p-6 border border-primary-100 rounded-apple bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg sm:text-xl font-normal text-primary-900 mb-2 tracking-tight">{resource.title}</h2>
            <p className="text-sm sm:text-base font-light text-primary-600 leading-relaxed">{resource.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
