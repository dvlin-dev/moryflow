import { Container } from './Container'

const footerLinks = {
  product: [
    { href: 'https://docs.memai.dev', label: 'Documentation' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/blog', label: 'Blog' },
    { href: 'https://status.memai.dev', label: 'Status' },
  ],
  company: [
    { href: '/about', label: 'About' },
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
  ],
  developers: [
    { href: 'https://github.com/dvlin-dev/memai', label: 'GitHub' },
    { href: 'https://docs.memai.dev/api', label: 'API Reference' },
    { href: 'https://docs.memai.dev/sdks', label: 'SDKs' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container>
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="font-mono text-lg font-bold tracking-tight">
                memai
              </span>
              <p className="mt-4 text-sm text-muted-foreground">
                Semantic Memory API for AI Agents
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
                Product
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
                Company
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
                Developers
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.developers.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} memai. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/memai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Twitter
              </a>
              <a
                href="https://github.com/dvlin-dev/memai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}
