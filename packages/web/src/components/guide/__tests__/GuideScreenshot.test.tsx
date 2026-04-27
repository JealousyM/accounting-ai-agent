import { render, screen, fireEvent } from '@testing-library/react';
import { GuideScreenshot } from '../GuideScreenshot';

describe('GuideScreenshot', () => {
  it('renders <img> initially with caption', () => {
    render(
      <GuideScreenshot
        src="/guide/ksef/get-tokens/01-login.png"
        alt="login"
        caption="The login page"
        placeholderHint="Screenshot of login page"
      />,
    );
    expect(screen.getByAltText('login')).toBeInTheDocument();
    expect(screen.getByText('The login page')).toBeInTheDocument();
  });

  it('falls back to placeholder when image fails to load', () => {
    render(
      <GuideScreenshot
        src="/missing.png"
        alt="login"
        caption="The login page"
        placeholderHint="Screenshot of login page"
      />,
    );
    fireEvent.error(screen.getByAltText('login'));
    expect(screen.getByText('Screenshot of login page')).toBeInTheDocument();
  });
});
