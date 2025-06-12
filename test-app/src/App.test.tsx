import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders keychain testing app', () => {
  render(<App />);
  const headingElement = screen.getByText(/Steem Keychain Testing App/i);
  expect(headingElement).toBeInTheDocument();
});
