/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 关于页面
 */

import { createFileRoute } from '@tanstack/react-router'
import { generateMeta, siteConfig } from '@/lib/seo'
import { Heart, Target, Users } from 'lucide-react'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: generateMeta({
      title: 'About',
      description: 'Learn about Moryflow - our mission, vision, and the team behind the AI companion.',
      path: '/about',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/about` }],
  }),
  component: AboutPage,
})

const values = [
  {
    icon: Heart,
    title: 'User First',
    description: 'Everything we build starts with understanding what users truly need. No dark patterns, no hidden agendas.',
  },
  {
    icon: Target,
    title: 'Privacy by Design',
    description: 'Your data belongs to you. Local-first architecture ensures your information never leaves your device without consent.',
  },
  {
    icon: Users,
    title: 'Open & Honest',
    description: 'We believe in transparency. Clear communication about what we do and why we do it.',
  },
]

function AboutPage() {
  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
            About Moryflow
          </h1>
          <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
            We're building the AI companion we always wanted - one that truly understands you,
            respects your privacy, and grows with you.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-mory-bg to-orange-50/50 rounded-3xl p-8 sm:p-12">
            <h2 className="font-serif text-3xl font-bold text-mory-text-primary mb-6">
              Our Mission
            </h2>
            <p className="text-lg text-mory-text-secondary leading-relaxed mb-6">
              We believe AI should be a personal companion, not just a tool. Mory is designed to remember,
              understand, and grow with you - helping you achieve your goals while keeping your data private and secure.
            </p>
            <p className="text-lg text-mory-text-secondary leading-relaxed">
              Unlike cloud-based AI services that treat your data as a product, Mory puts you in control.
              Your thoughts, your notes, your memories - they all stay with you.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl font-bold text-mory-text-primary text-center mb-12">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-mory-orange/10 rounded-2xl flex items-center justify-center">
                  <value.icon size={32} className="text-mory-orange" />
                </div>
                <h3 className="text-xl font-serif font-bold text-mory-text-primary mb-3">
                  {value.title}
                </h3>
                <p className="text-mory-text-secondary">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold text-mory-text-primary mb-6">
            Get in Touch
          </h2>
          <p className="text-mory-text-secondary mb-8">
            Have questions, feedback, or just want to say hi?
            We'd love to hear from you.
          </p>
          <a
            href="mailto:hello@moryflow.com"
            className="inline-flex items-center gap-2 bg-mory-text-primary text-white px-8 py-4 rounded-xl font-medium hover:bg-black transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>
    </main>
  )
}
