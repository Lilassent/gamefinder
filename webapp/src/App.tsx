import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './Login';
import SignUpPage from './SignUp';
import MainPage from './MainPage';
import WishlistPage from './WishlistPage';
import AccountSettings from './AccountSettings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/account" element={<AccountSettings />} />
    </Routes>
  );
}

export default App;
