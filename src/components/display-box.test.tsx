import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisplayWarning } from './display-box';

describe('DisplayWarning', () => {
  it('renders title and text', () => {
    render(<DisplayWarning title="Attention" text="Something happened" />);
    expect(screen.getByText('Attention')).toBeInTheDocument();
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('renders action button and handles click when btn provided', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<DisplayWarning text="Proceed?" btn={handler} />);
    const button = screen.getByRole('button', { name: /continue anyway/i });
    await user.click(button);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
