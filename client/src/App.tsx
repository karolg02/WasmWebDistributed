import '@mantine/core/styles.css';
import 'primeicons/primeicons.css';
import { createTheme, MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { Routing } from "./features/Routing";
import { SocketProvider } from "./context/Socket";
import { Notifications } from "@mantine/notifications";

const theme = createTheme({
  primaryColor: 'dark',
  primaryShade: 7,
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#0a0b0d',
    ],
    gray: [
      '#f8f9fa',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529',
      '#0d1117',
    ],
  },
  components: {
    Progress: {
      styles: {
        root: {
          background: 'rgba(13, 17, 23, 0.6)',
          backdropFilter: 'blur(10px)',
        },
        bar: {
          transition: 'width 0.5s ease-out',
          background: 'linear-gradient(45deg, #495057, #6c757d)',
        },
      },
    },
    Card: {
      styles: {
        root: {
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    Button: {
      styles: {
        root: {
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(73, 80, 87, 0.4)',
          },
        },
      },
    },
  },
})

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <SocketProvider>
        <BrowserRouter>
          <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0d1117 0%, #161b22 25%, #21262d 50%, #2d333b 75%, #373e47 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 20s ease infinite',
          }}>
            <style>{`
              @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              .fade-in {
                animation: fadeIn 0.6s ease-out;
              }
            `}</style>
            <Routing />
            <Notifications style={{ position: 'fixed', bottom: 0, right: 0 }} />
          </div>
        </BrowserRouter>
      </SocketProvider>
    </MantineProvider>
  )
}

export default App