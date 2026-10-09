import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { WeBuy } from './components/WeBuy'
import { Process } from './components/Process'
import { WhyUs } from './components/WhyUs'
import { About } from './components/About'
import { LocationSection } from './components/Location'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { MobileActionBar } from './components/MobileActionBar'
import { AdminApp } from './components/admin/AdminApp'

function App() {
  const [scrolled, setScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if URL hash indicates admin panel
    const checkHash = () => {
      setIsAdmin(window.location.hash.startsWith('#admin'))
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (isAdmin) {
    return <AdminApp />
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header scrolled={scrolled} />
      <main>
        <Hero />
        <WeBuy />
        <Process />
        <WhyUs />
        <About />
        <LocationSection />
        <Contact />
      </main>
      <Footer />
      <MobileActionBar />
    </div>
  )
}

export default App
