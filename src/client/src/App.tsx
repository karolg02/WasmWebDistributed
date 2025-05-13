import '@mantine/core/styles.css';
import 'primeicons/primeicons.css';
import { createTheme, MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { Routing } from "./features/Routing";

const theme = createTheme({
  primaryColor: 'cyan',
  primaryShade: 6,
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
      '#101113',
    ],
  },
  components: {
    Progress: {
      styles: {
        root: {
          background: 'rgba(44, 46, 51, 0.5)',
        },
        bar: {
          transition: 'width 0.5s ease-out',
        },
      },
    },
  },
})

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <BrowserRouter>
        <Routing />
      </BrowserRouter>
    </MantineProvider>
  )
}

export default App