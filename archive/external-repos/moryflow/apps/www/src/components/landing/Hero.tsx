/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage Hero section with scenario demo animation
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

const scenarios = [
  {
    id: 'exam',
    emoji: '📚',
    userRequest: 'Help me prepare for next month\'s English exam',
    steps: [
      { type: 'thinking', text: 'I remember your last study focus...' },
      { type: 'result', text: 'Reviewed your 20 vocabulary notebooks' },
      { type: 'result', text: 'Found your grammar is quite solid' },
      { type: 'thinking', text: 'Checking this year\'s exam updates...' },
      { type: 'result', text: 'Found new question formats online' },
      { type: 'thinking', text: 'Creating a plan for your weak areas' },
      { type: 'result', text: 'Done! Focus on listening and writing' },
    ],
    summary: 'It remembers what you\'ve learned and helps accordingly',
  },
  {
    id: 'event',
    emoji: '🎉',
    userRequest: 'Help me plan the company annual party',
    steps: [
      { type: 'thinking', text: 'Looking at last year\'s event records...' },
      { type: 'result', text: 'Found budget and feedback notes' },
      { type: 'thinking', text: 'Searching for creative ideas...' },
      { type: 'result', text: 'Found 10 creative party concepts' },
      { type: 'thinking', text: 'Designing the flow within budget' },
      { type: 'result', text: 'Done! Created the event proposal' },
    ],
    summary: 'Past experience + creative ideas + complete proposal',
  },
]

export function Hero() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [displayedSteps, setDisplayedSteps] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(true)

  const currentScenario = scenarios[currentScenarioIndex]

  // Auto-switch scenarios
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayedSteps(0)
      setIsAnimating(false)
      setTimeout(() => {
        setCurrentScenarioIndex((prev) => (prev + 1) % scenarios.length)
        setIsAnimating(true)
      }, 300)
    }, 6500)

    return () => clearTimeout(timer)
  }, [currentScenarioIndex])

  // Typing animation
  useEffect(() => {
    if (!isAnimating || displayedSteps >= currentScenario.steps.length) return

    const timer = setTimeout(() => {
      setDisplayedSteps((prev) => prev + 1)
    }, 500)

    return () => clearTimeout(timer)
  }, [displayedSteps, isAnimating, currentScenario.steps.length])

  const scrollToDownload = () => {
    const downloadSection = document.getElementById('download')
    if (downloadSection) {
      downloadSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
      {/* Background Ambient Light */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/30 rounded-full blur-[120px] animate-float" />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[100px] animate-float"
        style={{ animationDelay: '2s' }}
      />

      <div className="container mx-auto relative z-10 flex flex-col items-center text-center max-w-6xl">
        {/* Main Heading */}
        <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-mory-text-primary tracking-tight mb-3 sm:mb-6 text-balance leading-[1.15]">
          Not a chatbot
          <br />
          A thinking companion
        </h1>

        {/* Subheading */}
        <p className="max-w-3xl text-sm sm:text-lg md:text-xl text-mory-text-secondary mb-6 sm:mb-12 leading-relaxed text-balance">
          Tell Mory what you want to do, and it figures out how to help.
        </p>

        {/* Interactive Demo Area */}
        <div className="w-full max-w-3xl mb-6 sm:mb-12 relative">
          {/* Glow effect behind card */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-purple-400/20 to-orange-400/20 rounded-3xl blur-3xl" />

          <div className="relative bg-gradient-to-br from-white/98 to-orange-50/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-10 border border-white/90 shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] shadow-orange-100/50">
            {/* Scenario Indicator */}
            <div className="flex justify-center gap-2 mb-4 sm:mb-8">
              {scenarios.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDisplayedSteps(0)
                    setIsAnimating(false)
                    setTimeout(() => {
                      setCurrentScenarioIndex(index)
                      setIsAnimating(true)
                    }, 300)
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentScenarioIndex
                      ? 'w-8 bg-mory-orange'
                      : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Scenario ${index + 1}`}
                />
              ))}
            </div>

            <div key={currentScenario.id}>
              {/* User Request */}
              <div className="mb-4 sm:mb-8 p-3 sm:p-5 bg-orange-50/85 backdrop-blur-md rounded-xl sm:rounded-2xl border-l-4 border-mory-orange shadow-sm text-left">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-2xl sm:text-3xl flex-shrink-0">
                    {currentScenario.emoji}
                  </span>
                  <p className="text-sm sm:text-base md:text-lg text-mory-text-primary font-medium">
                    "{currentScenario.userRequest}"
                  </p>
                </div>
              </div>

              {/* Mory's Process */}
              <div className="space-y-2 sm:space-y-3 min-h-[180px] sm:min-h-[280px] text-left">
                {currentScenario.steps.slice(0, displayedSteps).map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 sm:gap-3 animate-fade-in ${
                      step.type === 'thinking' ? 'pl-0' : 'pl-1 sm:pl-2'
                    }`}
                  >
                    {step.type === 'thinking' ? (
                      <>
                        <span className="text-base sm:text-xl flex-shrink-0">💭</span>
                        <p className="text-xs sm:text-sm md:text-base text-mory-text-secondary italic pt-0.5">
                          {step.text}
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          size={16}
                          className="text-mory-orange flex-shrink-0 mt-0.5 sm:w-5 sm:h-5"
                        />
                        <p className="text-xs sm:text-sm md:text-base text-mory-text-primary pt-0.5">
                          {step.text}
                        </p>
                      </>
                    )}
                  </div>
                ))}

                {/* Summary - shown when all steps complete */}
                {displayedSteps >= currentScenario.steps.length && (
                  <div className="pt-4 mt-4 border-t border-gray-100 animate-fade-in">
                    <p className="text-sm text-mory-orange font-medium flex items-center gap-2">
                      <span>💡</span>
                      {currentScenario.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={scrollToDownload}
            className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-mory-text-primary text-white rounded-xl sm:rounded-2xl font-medium text-base sm:text-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2">Free Download</span>
          </button>
        </div>
      </div>

      {/* Scroll Indicator - hidden on mobile */}
      <div className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-white/80 shadow-sm shadow-gray-200/30">
          <span className="text-xs font-medium text-mory-text-secondary">
            See what else I can do
          </span>
        </div>
        <div className="w-[1px] h-12 bg-gradient-to-b from-gray-400/50 to-transparent" />
      </div>
    </section>
  )
}
