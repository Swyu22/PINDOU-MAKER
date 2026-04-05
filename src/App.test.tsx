import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders the main controls for the bead pattern workflow', () => {
    render(<App />);

    expect(screen.getByText('拼豆图纸生成器')).toBeInTheDocument();
    expect(screen.getByLabelText('目标尺寸')).toBeInTheDocument();
    expect(screen.getByLabelText('颜色上限')).toBeInTheDocument();
    expect(screen.getByLabelText('平滑强度')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /48/ })).toBeInTheDocument();
  });

  it('starts stylized-image generation with a moderate first-pass color budget', () => {
    render(<App />);

    expect(screen.getAllByRole('slider')[0]).toHaveValue('48');
  });
});
