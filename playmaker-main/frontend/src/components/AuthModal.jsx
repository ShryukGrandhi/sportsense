import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(loginData.email, loginData.password);

    if (result.success) {
      onClose();
      setLoginData({ email: '', password: '' });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(
      registerData.username,
      registerData.email,
      registerData.password
    );
    
    if (result.success) {
      onClose();
      setRegisterData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#111111] border-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="text-white text-center text-2xl font-light">
            PLAYMAKER
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-center text-xs uppercase tracking-wider mt-2">
            Sports Intelligence Platform
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0a0a0a] border border-[#1a1a1a]">
            <TabsTrigger value="login" className="text-gray-600 data-[state=active]:text-white data-[state=active]:bg-[#111111] text-sm uppercase tracking-wider">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="text-gray-600 data-[state=active]:text-white data-[state=active]:bg-[#111111] text-sm uppercase tracking-wider">
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-600 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white focus:border-white"
                  placeholder="Enter email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-600 text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="bg-[#0a0a0a] border-[#1a1a1a] text-white pr-10 focus:border-white"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-[#0a0a0a] hover:bg-gray-100 font-medium text-sm uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-gray-600 text-xs uppercase tracking-wider">
                  Username
                </Label>
                <Input
                  id="register-username"
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white focus:border-white"
                  minLength="3"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-gray-600 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="register-email"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white focus:border-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-gray-600 text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="bg-[#0a0a0a] border-[#1a1a1a] text-white pr-10 focus:border-white"
                    minLength="6"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password" className="text-gray-600 text-xs uppercase tracking-wider">
                  Confirm Password
                </Label>
                <Input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white focus:border-white"
                  minLength="6"
                  required
                />
              </div>

              {error && (
                <div className="text-white text-sm text-center bg-[#111111] border border-white/20 p-3">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-[#0a0a0a] hover:bg-gray-100 font-medium text-sm uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;