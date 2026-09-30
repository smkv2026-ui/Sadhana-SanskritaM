import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Logo, LogoMark } from './Logo';
import { BRAND, PETALS, buildLogoSvg } from './logoGeometry';

describe('Logo', () => {
  it('renders an accessible mark with every petal and the diamond', () => {
    render(<LogoMark size={80} />);
    const svg = screen.getByRole('img', { name: BRAND.name });
    expect(svg.querySelectorAll('.logo-petal')).toHaveLength(PETALS.length);
    expect(svg.querySelectorAll('.logo-facet').length).toBeGreaterThan(4);
    expect(svg.querySelector('.logo-stem')).not.toBeNull();
    expect(svg.querySelector('.logo-book')).not.toBeNull();
  });

  it('supports variants, compact icon, animation and lockups', () => {
    const { container } = render(
      <>
        <LogoMark variant="mono" compact animated />
        <Logo lockup="horizontal" size={40} />
      </>,
    );
    const marks = container.querySelectorAll('svg.ss-logo');
    expect(marks[0].classList.contains('tone-mono')).toBe(true);
    expect(marks[0].classList.contains('is-animated')).toBe(true);
    expect(marks[0].querySelector('.logo-book')).toBeNull();
    expect(container.textContent).toContain(BRAND.name);
  });

  it('stays well under the 30 KB budget (inline SVG, no raster)', () => {
    const markup = renderToStaticMarkup(<LogoMark animated />);
    expect(markup.length).toBeLessThan(30 * 1024);
    for (const tone of ['full', 'full-dark', 'mono'] as const) {
      const svg = buildLogoSvg({ tone });
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.length).toBeLessThan(30 * 1024);
      expect(svg).not.toMatch(/<image|data:image/);
    }
  });

  it('every positioned group keeps its translate on a parent (CSS transforms only animate inner groups)', () => {
    const markup = renderToStaticMarkup(<LogoMark animated />);
    // Animated classes must never sit on an element that also carries a positioning transform attribute.
    for (const cls of ['logo-book', 'logo-diamond', 'logo-flower', 'logo-sparkle', 'logo-sway']) {
      const re = new RegExp(`<g[^>]*transform="translate[^"]*"[^>]*class="${cls}"|<[a-z]+[^>]*class="${cls}"[^>]*transform="translate`);
      expect(markup).not.toMatch(re);
    }
  });
});
