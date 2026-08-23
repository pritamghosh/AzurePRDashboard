import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';

/**
 * Application entry point.
 *
 * - CssBaseline resets browser-default styles (MUI recommended).
 * - ThemeProvider applies the custom MUI theme globally.
 */

const theme = createTheme({
  palette: {
    primary: {
      main: '#0078d4', // Azure blue
    },
    warning: {
      main: '#f59e0b',
    },
    background: {
      default: '#f5f6fa',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);


