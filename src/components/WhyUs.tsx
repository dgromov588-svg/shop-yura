import {
  HandCoins,
  ShieldCheck,
  Truck,
  Eye,
  Receipt,
  HeartHandshake,
} from 'lucide-react'
import { LogoMark } from './Logo'
import { Ornament } from './Ornament'

const reasons = [
  {
    icon: HandCoins,
    title: 'Чесна ціна',
    text: 'Пропоную реальну ринкову вартість — без занижень і торгу в найгірших традиціях.',
  },
  {
    icon: ShieldCheck,
    title: 'Повна конфіденційність',
    text: 'Гарантую анонімність та делікатність у разі спадку, розлучення або інших обставин.',
  },
  {
    icon: Receipt,
    title: 'Купівля за договором',
    text: 'Укладаю договір купівлі-продажу, надаю всі необхідні документи.',
  },
  {
    icon: Truck,
    title: 'Виїзд безкоштовно',
    text: 'Приїду до вас у будь-яку точку Дніпра чи області для оцінки великих колекцій.',
  },
  {
    icon: Eye,
    title: 'Експертна оцінка',
    text: '15+ років досвіду роботи з антикваріатом, знання ринку та провенансу.',
  },
  {
    icon: HeartHandshake,
    title: 'Індивідуальний підхід',
    text: 'До кожного клієнта та кожного предмета — з повагою та увагою.',
  },
]

export function WhyUs() {
  return (
    <section id="why-us" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
            Чому звертаються до мене
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900">
            <span className="text-amber-700 italic">Справедливо</span>, чесно, без зайвих клопотів
          </h2>
          <Ornament align="left" className="mt-5" />
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r, i) => {
            const Icon = r.icon
            return (
              <div
                key={r.title}
                className="group relative bg-white rounded-2xl p-6 border border-amber-200/60 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      0{i + 1}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-stone-900 leading-tight">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                      {r.text}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Big quote */}
        <div className="mt-16 relative bg-wood frame-carved rounded-3xl p-8 lg:p-12 overflow-hidden shadow-2xl shadow-stone-900/30">
          <div className="absolute top-0 right-0 text-[200px] font-black text-amber-400/5 leading-none -mr-4 -mt-8 select-none">
            ”
          </div>
          <div className="relative max-w-3xl">
            <div className="text-3xl lg:text-4xl font-black text-amber-50 leading-tight">
              «Я працюю не з речами — я працюю з{' '}
              <span className="text-amber-400">історіями</span>, які ці речі зберігають»
            </div>
            <div className="mt-6 flex items-center gap-3">
              <LogoMark className="w-14 h-14 drop-shadow-lg" />
              <div>
                <div className="font-bold text-amber-50">Юрій</div>
                <div className="text-sm text-amber-200/70">
                  Оцінювач антикваріату
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
