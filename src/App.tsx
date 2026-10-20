import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PhotoViewerProvider } from './components/PhotoViewer';
import { I18nProvider } from './i18n';
import { StoreProvider } from './lib/store';
import { About } from './pages/About';
import { Auth } from './pages/Auth';
import { Build } from './pages/Build';
import { Checkout } from './pages/Checkout';
import { Country } from './pages/Country';
import { Credits } from './pages/Credits';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { PlanPage } from './pages/Plan';
import { TripDetail } from './pages/TripDetail';
import { Trips } from './pages/Trips';

// HashRouter keeps deep links working on GitHub Pages, which has no server-side routing.
export function App() {
  return (
    <I18nProvider>
      <StoreProvider>
        <PhotoViewerProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="country/:id" element={<Country />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="build" element={<Build />} />
                <Route path="signin" element={<Auth mode="signin" />} />
                <Route path="signup" element={<Auth mode="signup" />} />
                <Route path="trips" element={<Trips />} />
                <Route path="trips/:id" element={<TripDetail />} />
                <Route path="checkout/:id" element={<Checkout />} />
                <Route path="credits" element={<Credits />} />
                <Route path="mission" element={<About kind="mission" />} />
                <Route path="vision" element={<About kind="vision" />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter>
        </PhotoViewerProvider>
      </StoreProvider>
    </I18nProvider>
  );
}
