import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './shared/lib/AuthContext';
import RequireAuth from './shared/components/RequireAuth';
import Login from './features/auth/Login';
import Layout from './shared/components/Layout';
import SplashScreen from './shared/components/SplashScreen';

// Every screen behind the login is its own chunk, loaded on demand instead
// of all at once in the main bundle — Login/Layout stay eager since they're
// needed for the very first paint regardless of which page you land on.
const Home = lazy(() => import('./features/home/Home'));
const Partner = lazy(() => import('./features/couple/Partner'));
const GiftBoard = lazy(() => import('./features/gifts/GiftBoard'));
const Restaurants = lazy(() => import('./features/restaurants/Restaurants'));
const DateIdeas = lazy(() => import('./features/dateIdeas/DateIdeas'));
const Movies = lazy(() => import('./features/movies/Movies'));
const Agenda = lazy(() => import('./features/agenda/Agenda'));
const Notices = lazy(() => import('./features/notices/Notices'));
const Profile = lazy(() => import('./features/profile/Profile'));
const ShareTarget = lazy(() => import('./features/gifts/ShareTarget'));
const History = lazy(() => import('./features/history/History'));
const NotFound = lazy(() => import('./shared/components/NotFound'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="my-wishlist" element={<GiftBoard kind="myWishList" />} />
                <Route path="gifts-for-partner" element={<GiftBoard kind="myGiftsToGive" />} />
                <Route path="partner-wishlist" element={<GiftBoard kind="partnerWishList" />} />
                <Route path="purchased" element={<GiftBoard kind="purchased" />} />
                <Route path="restaurants" element={<Restaurants />} />
                <Route path="date-ideas" element={<DateIdeas />} />
                <Route path="movies" element={<Movies />} />
                <Route path="agenda" element={<Agenda />} />
                <Route path="history" element={<History />} />
                <Route path="partner" element={<Partner />} />
                <Route path="notices" element={<Notices />} />
                <Route path="profile" element={<Profile />} />
                <Route path="share-target" element={<ShareTarget />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
