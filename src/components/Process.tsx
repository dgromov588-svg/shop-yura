import { MessageSquare, Camera, FileText, Banknote } from 'lucide-react'
import { Ornament } from './Ornament'

const steps = [
  {
    icon: MessageSquare,
    title: 'Звʼязатися',
    text: 'Телефонуйте або пишіть у зручний месенджер — Telegram, Viber, WhatsApp.',
  },
  {
    icon: Camera,
    title: 'Надіслати фото',
    text: 'Скиньте кілька фото предмета з різних ракурсів, бажано зі штампом або підписом.',
  },
  {
    icon: FileText,
    title: 'Оцінка',
    text: 'Я вивчу предмет, за потреби — приїду особисто для детального огляду.',
  },
  {
    icon: Banknote,
    title: 'Розрахунок',
    text: 'Якщо ціна влаштовує — одразу розраховуюсь готівкою або переказом на картку.',
  },
]

export function Process() {
  return (
    <section
      id="process"
      className="py-20 lg:py-28 bg-wood text-amber-50 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 30%, rgba(245, 158, 11, 0.3), transparent 40%), radial-gradient(circle at 80% 70%, rgba(217, 119, 6, 0.25), transparent 50%)',
        }}
      ></div>

      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Як це працює
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Простий та <span className="text-brass italic">чесний процес</span>
          </h2>
          <Ornament tone="light" className="mt-5" />
          <p className="mt-4 text-lg text-amber-100/70">
            Чотири кроки від першого звернення до отримання грошей
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Line connector */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-400 to-amber-500/20"></div>

          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="relative text-center">
                <div className="relative inline-flex">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/30 relative z-10">
                    <Icon className="w-10 h-10" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-stone-50 text-stone-950 font-black flex items-center justify-center text-sm shadow-lg">
                    0{i + 1}
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-amber-100/70 leading-relaxed px-2">
                  {s.text}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
