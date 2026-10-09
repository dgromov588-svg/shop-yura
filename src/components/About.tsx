import { GraduationCap, Briefcase, Trophy, MapPin } from 'lucide-react'
import { Ornament } from './Ornament'
import { BUY_CATEGORIES } from '../lib/categories'

export function About() {
  return (
    <section id="about" className="py-20 lg:py-28 bg-gradient-to-b from-stone-50 to-amber-50/30">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
            Про оцінювача
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900">
            Юрій — ваш{' '}
            <span className="text-amber-700 italic">експерт з антикваріату</span>
          </h2>
          <Ornament align="left" className="mt-5" />
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            Понад 15 років я займаюсь оцінкою та скупкою предметів старовини.
            Починав як колекціонер, тому розумію цінність кожної речі як з
            боку покупця, так і з боку власника. Працюю прозоро — моє завдання
            запропонувати справедливу ціну, а не «вибити» вигідну для себе.
          </p>
          <p className="mt-4 text-lg text-stone-600 leading-relaxed">
            У салоні «АнтикварЪ» приймаю як одну річ, так і цілі колекції:
            старі книги, листівки, форму, моделі, фототехніку. Консультація —
            безкоштовна, телефонуйте: (050) 562-35-23.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-stone-900">Освіта</div>
                <div className="text-sm text-stone-600">
                  Мистецтвознавство, ДНУ
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-stone-900">Досвід</div>
                <div className="text-sm text-stone-600">15+ років у сфері</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-stone-900">Сертифікати</div>
                <div className="text-sm text-stone-600">Експерт-оцінювач</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-stone-900">Географія</div>
                <div className="text-sm text-stone-600">Дніпро + область</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="./category-books.jpg"
                  alt="Дореволюційні книги"
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="./cat-postcards.jpg"
                  alt="Листівки та фотокартки царського періоду"
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="./cat-military.jpg"
                  alt="Стара військова форма, кокарди"
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={BUY_CATEGORIES.find((c) => c.id === 'cameras')!.img}
                  alt="Фотоапарати, обʼєктиви, біноклі"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          </div>

          {/* Floating card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-amber-400 to-yellow-700 rounded-2xl shadow-2xl p-5 text-stone-950 -rotate-6 hover:rotate-0 transition-transform">
            <div className="text-3xl font-black">15+</div>
            <div className="text-sm font-semibold">років досвіду</div>
          </div>
        </div>
      </div>
    </section>
  )
}
