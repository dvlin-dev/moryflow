import { Container } from './Container';

const footerItems = {
  product: ['Documentation', 'API Reference'],
  legal: ['Terms', 'Privacy'],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container>
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="font-mono text-lg font-bold tracking-tight">AIGET</span>
              <p className="mt-4 text-sm text-muted-foreground">Get anything for AI.</p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">Product</h3>
              <ul className="mt-4 space-y-3">
                {footerItems.product.map((item) => (
                  <li key={item}>
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">Legal</h3>
              <ul className="mt-4 space-y-3">
                {footerItems.legal.map((item) => (
                  <li key={item}>
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 flex items-center justify-center border-t border-border pt-8">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Aiget. All rights reserved.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
